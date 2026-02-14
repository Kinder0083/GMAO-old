"""
Service M.E.S (Manufacturing Execution System)
Gestion des machines de production, calcul de cadence, temps d'arrêt, alertes
"""
import asyncio
import logging
import os
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from bson import ObjectId

logger = logging.getLogger(__name__)


class MESService:
    # Dictionnaire de stockage des équipements par topic pour lookup rapide
    mes_equipments_by_topic: Dict[str, ObjectId] = {}
    
    def __init__(self, db, mqtt_manager=None):
        self.db = db
        self.mqtt_manager = mqtt_manager
        self._subscribed_topics = set()
        self._pending_topics = set()  # Topics en attente si MQTT pas connecté
        
        # Enregistrer ce service comme listener de connexion MQTT
        if mqtt_manager:
            mqtt_manager.add_on_connect_listener(self._on_mqtt_connected)
            logger.info("[MES] Service enregistré comme listener de connexion MQTT")
    
    def _on_mqtt_connected(self):
        """Appelé quand MQTT se (re)connecte - re-souscrire aux topics"""
        logger.info("[MES] 🔌 MQTT connecté, re-souscription aux topics M.E.S....")
        self._resubscribe_all()

    # ==================== MACHINES CRUD ====================

    async def create_machine(self, data: dict) -> dict:
        machine = {
            "equipment_id": ObjectId(data["equipment_id"]),
            "mqtt_topic": data["mqtt_topic"],
            "sensor_ip": data.get("sensor_ip", ""),
            "theoretical_cadence": float(data.get("theoretical_cadence", 6)),  # cp/min
            "downtime_margin_pct": float(data.get("downtime_margin_pct", 30)),  # %
            "trs_target": float(data.get("trs_target", 85)),  # % objectif TRS
            "production_schedule": {
                "is_24h": bool(data.get("schedule_is_24h", True)),
                "start_hour": int(data.get("schedule_start_hour", 6)),
                "end_hour": int(data.get("schedule_end_hour", 22)),
                "production_days": data.get("schedule_production_days", [0, 1, 2, 3, 4]),  # Mon-Fri
            },
            "alerts": {
                "stopped_minutes": int(data.get("alert_stopped_minutes", 5)),
                "under_cadence": float(data.get("alert_under_cadence", 0)),
                "over_cadence": float(data.get("alert_over_cadence", 0)),
                "daily_target": int(data.get("alert_daily_target", 0)),
                "no_signal_minutes": int(data.get("alert_no_signal_minutes", 10)),
            },
            "email_notifications": {
                "enabled": bool(data.get("email_enabled", False)),
                "recipients": data.get("email_recipients", []),
                "alert_types": data.get("email_alert_types", []),
                "delay_minutes": int(data.get("email_delay_minutes", 5)),
            },
            "active": True,
            "created_at": datetime.now(timezone.utc),
            "last_pulse_at": None,
            "is_running": False,
        }
        result = await self.db.mes_machines.insert_one(machine)
        machine["_id"] = result.inserted_id
        self._subscribe_machine(machine)
        return self._serialize(machine)

    async def update_machine(self, machine_id: str, data: dict) -> dict:
        update = {}
        fields_map = {
            "mqtt_topic": str, "sensor_ip": str,
            "theoretical_cadence": float, "downtime_margin_pct": float, "active": bool,
            "trs_target": float,
        }
        for field, cast in fields_map.items():
            if field in data:
                update[field] = cast(data[field])

        alert_fields = {
            "alert_stopped_minutes": ("alerts.stopped_minutes", int),
            "alert_under_cadence": ("alerts.under_cadence", float),
            "alert_over_cadence": ("alerts.over_cadence", float),
            "alert_daily_target": ("alerts.daily_target", int),
            "alert_no_signal_minutes": ("alerts.no_signal_minutes", int),
        }
        for key, (path, cast) in alert_fields.items():
            if key in data:
                update[path] = cast(data[key])

        # Production schedule fields
        schedule_fields = {
            "schedule_is_24h": ("production_schedule.is_24h", bool),
            "schedule_start_hour": ("production_schedule.start_hour", int),
            "schedule_end_hour": ("production_schedule.end_hour", int),
        }
        for key, (path, cast) in schedule_fields.items():
            if key in data:
                update[path] = cast(data[key])
        if "schedule_production_days" in data:
            update["production_schedule.production_days"] = [int(d) for d in data["schedule_production_days"]]

        # Email notification fields
        email_fields = {
            "email_enabled": ("email_notifications.enabled", bool),
            "email_delay_minutes": ("email_notifications.delay_minutes", int),
        }
        for key, (path, cast) in email_fields.items():
            if key in data:
                update[path] = cast(data[key])
        if "email_recipients" in data:
            update["email_notifications.recipients"] = [str(r).strip() for r in data["email_recipients"] if str(r).strip()]
        if "email_alert_types" in data:
            update["email_notifications.alert_types"] = list(data["email_alert_types"])

        if "equipment_id" in data:
            update["equipment_id"] = ObjectId(data["equipment_id"])

        if update:
            await self.db.mes_machines.update_one({"_id": ObjectId(machine_id)}, {"$set": update})

        machine = await self.db.mes_machines.find_one({"_id": ObjectId(machine_id)})
        if machine:
            self._subscribe_machine(machine)
        return self._serialize(machine) if machine else None

    async def delete_machine(self, machine_id: str):
        machine = await self.db.mes_machines.find_one({"_id": ObjectId(machine_id)})
        if machine and machine.get("mqtt_topic") in self._subscribed_topics:
            if self.mqtt_manager:
                self.mqtt_manager.unsubscribe(machine["mqtt_topic"])
            self._subscribed_topics.discard(machine["mqtt_topic"])
        await self.db.mes_machines.delete_one({"_id": ObjectId(machine_id)})
        await self.db.mes_pulses.delete_many({"machine_id": ObjectId(machine_id)})
        await self.db.mes_cadence_history.delete_many({"machine_id": ObjectId(machine_id)})
        await self.db.mes_alerts.delete_many({"machine_id": ObjectId(machine_id)})

    async def get_machines(self) -> list:
        machines = await self.db.mes_machines.find().to_list(500)
        result = []
        for m in machines:
            serialized = self._serialize(m)
            eq = await self.db.equipments.find_one({"_id": m.get("equipment_id")}, {"nom": 1})
            serialized["equipment_name"] = eq["nom"] if eq else "Inconnu"
            result.append(serialized)
        return result

    async def get_machine(self, machine_id: str) -> Optional[dict]:
        m = await self.db.mes_machines.find_one({"_id": ObjectId(machine_id)})
        if not m:
            return None
        serialized = self._serialize(m)
        eq = await self.db.equipments.find_one({"_id": m.get("equipment_id")}, {"nom": 1})
        serialized["equipment_name"] = eq["nom"] if eq else "Inconnu"
        return serialized

    # ==================== PULSE HANDLING ====================

    async def record_pulse(self, machine_id_or_topic: str, value: int = 1):
        """Enregistrer une impulsion (appelé par le callback MQTT)"""
        logger.info(f"[MES] record_pulse appelé: machine_id_or_topic={machine_id_or_topic}, value={value}")
        
        if ObjectId.is_valid(machine_id_or_topic):
            machine = await self.db.mes_machines.find_one({"_id": ObjectId(machine_id_or_topic)})
            logger.info(f"[MES] Recherche par ObjectId: {machine_id_or_topic} -> trouvé: {machine is not None}")
        else:
            machine = await self.db.mes_machines.find_one({"mqtt_topic": machine_id_or_topic, "active": True})
            logger.info(f"[MES] Recherche par topic: {machine_id_or_topic} -> trouvé: {machine is not None}")

        if not machine:
            logger.warning(f"[MES] ⚠️ Aucune machine trouvée pour: {machine_id_or_topic}")
            return
            
        if value != 1:
            logger.info(f"[MES] Valeur ignorée (!=1): {value}")
            return

        now = datetime.now(timezone.utc)
        mid = machine["_id"]
        
        logger.info(f"[MES] 📝 Enregistrement pulse pour machine {mid}...")

        # Store pulse
        await self.db.mes_pulses.insert_one({
            "machine_id": mid,
            "timestamp": now,
        })
        logger.info(f"[MES] ✅ Pulse enregistré dans mes_pulses")

        # Update machine state
        await self.db.mes_machines.update_one(
            {"_id": mid},
            {"$set": {"last_pulse_at": now, "is_running": True}}
        )
        logger.info(f"[MES] ✅ État machine mis à jour (is_running=True)")

    # ==================== METRICS ====================

    async def get_realtime_metrics(self, machine_id: str) -> dict:
        mid = ObjectId(machine_id)
        machine = await self.db.mes_machines.find_one({"_id": mid})
        if not machine:
            return {}

        now = datetime.now(timezone.utc)
        theoretical = machine.get("theoretical_cadence", 6)
        margin_pct = machine.get("downtime_margin_pct", 30)

        # Pulses last 60 seconds -> cp/min
        t_1min = now - timedelta(seconds=60)
        count_1min = await self.db.mes_pulses.count_documents({
            "machine_id": mid, "timestamp": {"$gte": t_1min}
        })

        # Pulses last hour -> cp/h
        t_1h = now - timedelta(hours=1)
        count_1h = await self.db.mes_pulses.count_documents({
            "machine_id": mid, "timestamp": {"$gte": t_1h}
        })

        # Pulses today (since midnight UTC)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count_today = await self.db.mes_pulses.count_documents({
            "machine_id": mid, "timestamp": {"$gte": today_start}
        })

        # Pulses last 24h
        t_24h = now - timedelta(hours=24)
        count_24h = await self.db.mes_pulses.count_documents({
            "machine_id": mid, "timestamp": {"$gte": t_24h}
        })

        # Downtime calculation
        last_pulse = machine.get("last_pulse_at")
        is_running = False
        downtime_seconds = 0

        if last_pulse:
            if last_pulse.tzinfo is None:
                last_pulse = last_pulse.replace(tzinfo=timezone.utc)
            expected_interval = 60.0 / theoretical if theoretical > 0 else 10
            threshold = expected_interval * (1 + margin_pct / 100)
            elapsed = (now - last_pulse).total_seconds()
            is_running = elapsed <= threshold
            if not is_running:
                downtime_seconds = elapsed

        # Downtime today (sum of gaps > threshold)
        downtime_today = await self._calc_downtime(mid, today_start, now, theoretical, margin_pct)

        # ==================== ADVANCED TRS (Level 3) ====================
        schedule = machine.get("production_schedule", {})
        is_24h = schedule.get("is_24h", True)
        start_hour = schedule.get("start_hour", 6)
        end_hour = schedule.get("end_hour", 22)
        production_days = schedule.get("production_days", [0, 1, 2, 3, 4])

        # Calculate planned production time today (seconds)
        today_weekday = now.weekday()  # 0=Monday
        if today_weekday not in production_days:
            planned_seconds = 0
        elif is_24h:
            planned_seconds = (now - today_start).total_seconds()
        else:
            prod_start = today_start.replace(hour=start_hour)
            prod_end = today_start.replace(hour=end_hour)
            if now < prod_start:
                planned_seconds = 0
            elif now > prod_end:
                planned_seconds = (prod_end - prod_start).total_seconds()
            else:
                planned_seconds = (now - prod_start).total_seconds()

        # Availability = (Planned - Downtime) / Planned
        if planned_seconds > 0:
            operating_seconds = max(planned_seconds - downtime_today, 0)
            availability = round(operating_seconds / planned_seconds * 100, 1)
        else:
            operating_seconds = 0
            availability = 0

        # Performance = (Actual count / Theoretical count during operating time)
        if theoretical > 0 and operating_seconds > 0:
            theoretical_during_uptime = theoretical * (operating_seconds / 60)
            performance = round(count_today / theoretical_during_uptime * 100, 1) if theoretical_during_uptime > 0 else 0
            performance = min(performance, 100)  # Cap at 100%
        else:
            performance = 0

        # Quality = (Total - Rejects) / Total
        rejects_total = await self.get_rejects_total(mid, today_start, now)
        if count_today > 0:
            good_parts = max(count_today - rejects_total, 0)
            quality = round(good_parts / count_today * 100, 1)
        else:
            quality = 100  # No production = no quality issues

        # TRS = Availability × Performance × Quality (as percentages)
        trs = round((availability / 100) * (performance / 100) * (quality / 100) * 100, 1)

        return {
            "cadence_per_min": count_1min,
            "cadence_per_hour": count_1h,
            "production_today": count_today,
            "production_24h": count_24h,
            "is_running": is_running,
            "downtime_current_seconds": round(downtime_seconds),
            "downtime_today_seconds": round(downtime_today),
            "trs": trs,
            "trs_availability": availability,
            "trs_performance": performance,
            "trs_quality": quality,
            "rejects_today": rejects_total,
            "good_parts_today": max(count_today - rejects_total, 0),
            "theoretical_cadence": theoretical,
            "planned_seconds": round(planned_seconds),
            "operating_seconds": round(operating_seconds),
            "last_pulse_at": last_pulse.isoformat() if last_pulse else None,
        }

    async def _calc_downtime(self, machine_id, start, end, theoretical, margin_pct):
        """Calculate total downtime between start and end"""
        expected_interval = 60.0 / theoretical if theoretical > 0 else 10
        threshold = expected_interval * (1 + margin_pct / 100)

        pulses = await self.db.mes_pulses.find(
            {"machine_id": machine_id, "timestamp": {"$gte": start, "$lte": end}},
            {"timestamp": 1}
        ).sort("timestamp", 1).to_list(100000)

        if not pulses:
            return (end - start).total_seconds()

        total_downtime = 0
        prev_time = start
        for p in pulses:
            ts = p["timestamp"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            gap = (ts - prev_time).total_seconds()
            if gap > threshold:
                total_downtime += gap
            prev_time = ts

        # Gap after last pulse
        gap = (end - prev_time).total_seconds()
        if gap > threshold:
            total_downtime += gap

        return total_downtime

    # ==================== CADENCE HISTORY ====================

    async def calculate_minute_cadence(self):
        """Called every minute by background task to store cadence history"""
        machines = await self.db.mes_machines.find({"active": True}).to_list(500)
        now = datetime.now(timezone.utc)
        t_1min = now - timedelta(seconds=60)

        for machine in machines:
            mid = machine["_id"]
            count = await self.db.mes_pulses.count_documents({
                "machine_id": mid, "timestamp": {"$gte": t_1min, "$lt": now}
            })
            await self.db.mes_cadence_history.insert_one({
                "machine_id": mid,
                "timestamp": now.replace(second=0, microsecond=0),
                "cadence": count,
                "theoretical": machine.get("theoretical_cadence", 0),
            })

            # Check alerts
            await self._check_alerts(machine, count, now)

    async def get_cadence_history(self, machine_id: str, period: str = "6h",
                                  date_from: str = None, date_to: str = None) -> list:
        mid = ObjectId(machine_id)
        now = datetime.now(timezone.utc)

        if period == "custom" and date_from and date_to:
            start = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            end = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            use_hourly = (end - start).total_seconds() > 86400
        elif period == "7d":
            start = now - timedelta(days=7)
            end = now
            use_hourly = True
        else:
            hours_map = {"6h": 6, "12h": 12, "24h": 24}
            h = hours_map.get(period, 6)
            start = now - timedelta(hours=h)
            end = now
            use_hourly = False

        if use_hourly:
            # Aggregate by hour
            pipeline = [
                {"$match": {"machine_id": mid, "timestamp": {"$gte": start, "$lte": end}}},
                {"$group": {
                    "_id": {
                        "year": {"$year": "$timestamp"},
                        "month": {"$month": "$timestamp"},
                        "day": {"$dayOfMonth": "$timestamp"},
                        "hour": {"$hour": "$timestamp"},
                    },
                    "cadence": {"$avg": "$cadence"},
                    "theoretical": {"$first": "$theoretical"},
                    "timestamp": {"$first": "$timestamp"},
                }},
                {"$sort": {"_id": 1}},
            ]
            docs = await self.db.mes_cadence_history.aggregate(pipeline).to_list(10000)
            return [{"timestamp": d["timestamp"].isoformat(), "cadence": round(d["cadence"], 1),
                      "theoretical": d.get("theoretical", 0)} for d in docs]
        else:
            docs = await self.db.mes_cadence_history.find(
                {"machine_id": mid, "timestamp": {"$gte": start, "$lte": end}},
                {"_id": 0, "timestamp": 1, "cadence": 1, "theoretical": 1}
            ).sort("timestamp", 1).to_list(100000)
            return [{"timestamp": d["timestamp"].isoformat(), "cadence": d["cadence"],
                      "theoretical": d.get("theoretical", 0)} for d in docs]

    # ==================== ALERTS ====================

    async def _check_alerts(self, machine, current_cadence, now):
        mid = machine["_id"]
        alerts_config = machine.get("alerts", {})
        theoretical = machine.get("theoretical_cadence", 0)
        margin_pct = machine.get("downtime_margin_pct", 30)

        # Check stopped
        stopped_min = alerts_config.get("stopped_minutes", 0)
        last_p = machine.get("last_pulse_at")
        if last_p and last_p.tzinfo is None:
            last_p = last_p.replace(tzinfo=timezone.utc)
        if stopped_min > 0 and last_p:
            elapsed = (now - last_p).total_seconds() / 60
            if elapsed >= stopped_min:
                await self._create_alert(mid, "STOPPED",
                    f"Machine à l'arrêt depuis {int(elapsed)} min")

        # Check under cadence
        under = alerts_config.get("under_cadence", 0)
        if under > 0 and current_cadence < under and current_cadence > 0:
            await self._create_alert(mid, "UNDER_CADENCE",
                f"Sous-cadence: {current_cadence} cp/min (seuil: {under})")

        # Check over cadence
        over = alerts_config.get("over_cadence", 0)
        if over > 0 and current_cadence > over:
            await self._create_alert(mid, "OVER_CADENCE",
                f"Sur-cadence: {current_cadence} cp/min (seuil: {over})")

        # Check daily target
        target = alerts_config.get("daily_target", 0)
        if target > 0:
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            count_today = await self.db.mes_pulses.count_documents({
                "machine_id": mid, "timestamp": {"$gte": today_start}
            })
            if count_today >= target:
                await self._create_alert(mid, "TARGET_REACHED",
                    f"Objectif journalier atteint: {count_today}/{target}")

        # Check no signal
        no_signal_min = alerts_config.get("no_signal_minutes", 0)
        if no_signal_min > 0 and last_p:
            elapsed_ns = (now - last_p).total_seconds() / 60
            if elapsed_ns >= no_signal_min:
                await self._create_alert(mid, "NO_SIGNAL",
                    f"Pas de signal depuis {int(elapsed_ns)} min")

    async def _create_alert(self, machine_id, alert_type, message):
        # Don't create duplicate alerts within 5 minutes
        recent = await self.db.mes_alerts.find_one({
            "machine_id": machine_id,
            "type": alert_type,
            "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(minutes=5)},
        })
        if recent:
            return

        eq_name = "Inconnu"
        machine = await self.db.mes_machines.find_one({"_id": machine_id})
        if machine:
            eq = await self.db.equipments.find_one({"_id": machine.get("equipment_id")}, {"nom": 1})
            if eq:
                eq_name = eq["nom"]

        await self.db.mes_alerts.insert_one({
            "machine_id": machine_id,
            "type": alert_type,
            "message": message,
            "equipment_name": eq_name,
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })

    async def get_alerts(self, unread_only=False, limit=50) -> list:
        query = {"read": False} if unread_only else {}
        alerts = await self.db.mes_alerts.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        return [self._serialize(a) for a in alerts]

    async def get_unread_alert_count(self) -> int:
        return await self.db.mes_alerts.count_documents({"read": False})

    async def mark_alert_read(self, alert_id: str):
        await self.db.mes_alerts.update_one({"_id": ObjectId(alert_id)}, {"$set": {"read": True}})

    async def mark_all_alerts_read(self):
        await self.db.mes_alerts.update_many({"read": False}, {"$set": {"read": True}})

    async def delete_all_alerts(self):
        """Supprimer toutes les alertes M.E.S."""
        await self.db.mes_alerts.delete_many({})

    # ==================== PING ====================

    async def ping_sensor(self, machine_id: str) -> dict:
        machine = await self.db.mes_machines.find_one({"_id": ObjectId(machine_id)})
        if not machine or not machine.get("sensor_ip"):
            return {"success": False, "message": "IP capteur non configurée"}
        ip = machine["sensor_ip"]
        try:
            result = subprocess.run(
                ["ping", "-c", "3", "-W", "2", str(ip)],
                capture_output=True, text=True, timeout=10
            )
            return {
                "success": result.returncode == 0,
                "ip": ip,
                "message": "Capteur joignable" if result.returncode == 0 else "Capteur injoignable",
                "output": result.stdout[-200:] if result.stdout else result.stderr[-200:]
            }
        except Exception as e:
            return {"success": False, "ip": ip, "message": str(e)}

    # ==================== MQTT SUBSCRIPTION ====================

    def _subscribe_machine(self, machine):
        topic = machine.get("mqtt_topic")
        if not topic or not self.mqtt_manager:
            return
        if not self.mqtt_manager.is_connected:
            # MQTT pas encore connecté: mettre en file d'attente
            self._pending_topics.add(topic)
            logger.warning(f"[MES] MQTT non connecté, topic en attente: {topic}")
            return
        if topic not in self._subscribed_topics:
            result = self.mqtt_manager.subscribe(topic, callback=self._on_mqtt_message)
            if result:
                self._subscribed_topics.add(topic)
                self._pending_topics.discard(topic)
                logger.info(f"[MES] Abonné au topic: {topic}")
            else:
                self._pending_topics.add(topic)
                logger.error(f"[MES] Échec abonnement topic: {topic}")

    def _resubscribe_all(self):
        """Re-souscrire à tous les topics (appelé quand MQTT se reconnecte)"""
        all_topics = self._subscribed_topics | self._pending_topics
        logger.info(f"[MES] Re-souscription à {len(all_topics)} topic(s): {list(all_topics)}")
        
        self._subscribed_topics.clear()
        self._pending_topics.clear()
        
        for topic in all_topics:
            if self.mqtt_manager and self.mqtt_manager.is_connected:
                logger.info(f"[MES] Tentative de re-souscription à: {topic}")
                result = self.mqtt_manager.subscribe(topic, callback=self._on_mqtt_message)
                if result:
                    self._subscribed_topics.add(topic)
                    logger.info(f"[MES] ✅ Re-abonné au topic: {topic}")
                else:
                    self._pending_topics.add(topic)
                    logger.error(f"[MES] ❌ Échec re-abonnement topic: {topic}")
            else:
                self._pending_topics.add(topic)
                logger.warning(f"[MES] MQTT non connecté, topic remis en attente: {topic}")

    def _on_mqtt_message(self, topic, payload, qos):
        """Callback MQTT - reçoit les impulsions
        Signature: (topic: str, payload: str, qos: int) depuis mqtt_manager._on_message
        Note: Ce callback est appelé depuis le thread paho-mqtt, pas le thread principal asyncio
        """
        logger.info(f"[MES] 📥 Message MQTT reçu: topic={topic}, payload={payload}, qos={qos}")
        
        try:
            # Convertir le payload en entier
            value = int(float(str(payload).strip()))
            logger.info(f"[MES] ✅ Pulse MQTT parsé: topic={topic}, value={value}")
            
            # Utiliser pymongo synchrone car on est dans un thread séparé
            self._record_pulse_sync(topic, value)
            
        except ValueError as ve:
            logger.warning(f"[MES] ⚠️ Payload non numérique: {payload} -> {ve}")
        except Exception as e:
            logger.error(f"[MES] ❌ Erreur traitement message MQTT: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    def _record_pulse_sync(self, machine_id_or_topic: str, value: int = 1):
        """Version synchrone de record_pulse pour le callback MQTT (thread séparé)"""
        from pymongo import MongoClient
        
        logger.info(f"[MES] record_pulse_sync appelé: topic={machine_id_or_topic}, value={value}")
        
        try:
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
            db_name = os.environ.get('DB_NAME', 'gmao_iris')
            
            mongo_client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
            db_sync = mongo_client[db_name]
            
            # Trouver la machine par topic
            if ObjectId.is_valid(machine_id_or_topic):
                machine = db_sync.mes_machines.find_one({"_id": ObjectId(machine_id_or_topic)})
                logger.info(f"[MES] Recherche par ObjectId: {machine_id_or_topic} -> trouvé: {machine is not None}")
            else:
                machine = db_sync.mes_machines.find_one({"mqtt_topic": machine_id_or_topic, "active": True})
                logger.info(f"[MES] Recherche par topic: {machine_id_or_topic} -> trouvé: {machine is not None}")
            
            if not machine:
                logger.warning(f"[MES] ⚠️ Aucune machine trouvée pour: {machine_id_or_topic}")
                mongo_client.close()
                return
            
            if value != 1:
                logger.info(f"[MES] Valeur ignorée (!=1): {value}")
                mongo_client.close()
                return
            
            now = datetime.now(timezone.utc)
            mid = machine["_id"]
            
            logger.info(f"[MES] 📝 Enregistrement pulse pour machine {mid}...")
            
            # Store pulse
            db_sync.mes_pulses.insert_one({
                "machine_id": mid,
                "timestamp": now,
            })
            logger.info(f"[MES] ✅ Pulse enregistré dans mes_pulses")
            
            # Update machine state
            db_sync.mes_machines.update_one(
                {"_id": mid},
                {"$set": {"last_pulse_at": now, "is_running": True}}
            )
            logger.info(f"[MES] ✅ État machine mis à jour (is_running=True)")
            
            mongo_client.close()
            
        except Exception as e:
            logger.error(f"[MES] ❌ Erreur record_pulse_sync: {e}")
            import traceback
            logger.error(traceback.format_exc())

    async def subscribe_all(self):
        """Subscribe to all active machine topics"""
        machines = await self.db.mes_machines.find({"active": True}).to_list(500)
        for m in machines:
            self._subscribe_machine(m)
        logger.info(f"[MES] {len(machines)} machines abonnées MQTT")

    # ==================== REJECT REASONS (Admin) ====================

    async def get_reject_reasons(self) -> list:
        reasons = await self.db.mes_reject_reasons.find({"active": True}).sort("label", 1).to_list(500)
        return [self._serialize(r) for r in reasons]

    async def create_reject_reason(self, data: dict) -> dict:
        reason = {
            "label": data["label"].strip(),
            "active": True,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.db.mes_reject_reasons.insert_one(reason)
        reason["_id"] = result.inserted_id
        return self._serialize(reason)

    async def update_reject_reason(self, reason_id: str, data: dict) -> dict:
        update = {}
        if "label" in data:
            update["label"] = data["label"].strip()
        if "active" in data:
            update["active"] = bool(data["active"])
        if update:
            await self.db.mes_reject_reasons.update_one({"_id": ObjectId(reason_id)}, {"$set": update})
        doc = await self.db.mes_reject_reasons.find_one({"_id": ObjectId(reason_id)})
        return self._serialize(doc) if doc else None

    async def delete_reject_reason(self, reason_id: str):
        await self.db.mes_reject_reasons.delete_one({"_id": ObjectId(reason_id)})

    # ==================== REJECTS (Operator) ====================

    async def declare_reject(self, machine_id: str, data: dict) -> dict:
        reject = {
            "machine_id": ObjectId(machine_id),
            "quantity": int(data["quantity"]),
            "reason": data.get("reason", ""),
            "custom_reason": data.get("custom_reason", ""),
            "operator": data.get("operator", ""),
            "timestamp": datetime.now(timezone.utc),
        }
        result = await self.db.mes_rejects.insert_one(reject)
        reject["_id"] = result.inserted_id
        return self._serialize(reject)

    async def get_rejects(self, machine_id: str, date_from: str = None, date_to: str = None) -> list:
        mid = ObjectId(machine_id)
        now = datetime.now(timezone.utc)
        if date_from and date_to:
            start = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            end = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        else:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
        rejects = await self.db.mes_rejects.find({
            "machine_id": mid,
            "timestamp": {"$gte": start, "$lte": end}
        }).sort("timestamp", -1).to_list(10000)
        return [self._serialize(r) for r in rejects]

    async def get_rejects_total(self, machine_id, start, end) -> int:
        """Get total reject quantity for a machine between start and end"""
        pipeline = [
            {"$match": {"machine_id": machine_id, "timestamp": {"$gte": start, "$lte": end}}},
            {"$group": {"_id": None, "total": {"$sum": "$quantity"}}},
        ]
        result = await self.db.mes_rejects.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0

    async def delete_reject(self, reject_id: str):
        await self.db.mes_rejects.delete_one({"_id": ObjectId(reject_id)})

    # ==================== DATA CLEANUP ====================

    async def cleanup_old_data(self):
        """Remove pulses older than 1 year"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=365)
        r1 = await self.db.mes_pulses.delete_many({"timestamp": {"$lt": cutoff}})
        r2 = await self.db.mes_cadence_history.delete_many({"timestamp": {"$lt": cutoff}})
        if r1.deleted_count or r2.deleted_count:
            logger.info(f"[MES] Nettoyage: {r1.deleted_count} pulses, {r2.deleted_count} cadences supprimés")

    # ==================== UTILS ====================

    def _serialize(self, doc):
        if not doc:
            return None
        result = {}
        for k, v in doc.items():
            if k == "_id":
                result["id"] = str(v)
            elif isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            else:
                result[k] = v
        return result
