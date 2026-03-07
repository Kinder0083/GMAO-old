"""
Templates de rapports pré-configurés par type de service
Ces templates sont automatiquement créés lors de l'assignation d'un responsable de service
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

# Templates pré-configurés par type de service
DEFAULT_REPORT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "MAINTENANCE": {
        "name": "Rapport Hebdo Maintenance",
        "description": "Rapport hebdomadaire automatique du service Maintenance : suivi des OT, équipements en panne, et performance de l'équipe.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "07:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": True,
                "include_availability": True,
                "include_alerts": True
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": True,
                "include_interventions": True
            },
            "team_performance": {
                "enabled": True,
                "include_time_spent": True,
                "include_by_technician": True
            }
        },
        "period": "previous_week"
    },
    
    "QHSE": {
        "name": "Rapport Hebdo QHSE",
        "description": "Rapport hebdomadaire du service QHSE : incidents, équipements critiques, demandes d'amélioration sécurité.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "08:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": False,
                "include_availability": True,
                "include_alerts": True
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": False,
                "include_interventions": True
            },
            "team_performance": {
                "enabled": False,
                "include_time_spent": False,
                "include_by_technician": False
            }
        },
        "period": "previous_week"
    },
    
    "PRODUCTION": {
        "name": "Rapport Hebdo Production",
        "description": "Rapport hebdomadaire du service Production : disponibilité des équipements, OT en cours, temps d'arrêt.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "06:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": True,
                "include_availability": True,
                "include_alerts": True
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": True,
                "include_interventions": True
            },
            "team_performance": {
                "enabled": True,
                "include_time_spent": True,
                "include_by_technician": True
            }
        },
        "period": "previous_week"
    },
    
    "LOGISTIQUE": {
        "name": "Rapport Hebdo Logistique",
        "description": "Rapport hebdomadaire du service Logistique : équipements de manutention, demandes d'achat, interventions.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "07:30",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": True,
                "include_availability": True,
                "include_alerts": False
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": False,
                "include_purchases": True,
                "include_interventions": True
            },
            "team_performance": {
                "enabled": True,
                "include_time_spent": True,
                "include_by_technician": True
            }
        },
        "period": "previous_week"
    },
    
    "LABO": {
        "name": "Rapport Hebdo Laboratoire",
        "description": "Rapport hebdomadaire du Laboratoire : état des équipements de mesure, calibrations, OT.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "08:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": True,
                "include_availability": True,
                "include_alerts": True
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": True,
                "include_interventions": False
            },
            "team_performance": {
                "enabled": False,
                "include_time_spent": False,
                "include_by_technician": False
            }
        },
        "period": "previous_week"
    },
    
    "INDUS": {
        "name": "Rapport Hebdo Industrialisation",
        "description": "Rapport hebdomadaire du service Industrialisation : projets d'amélioration, OT, équipements.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "08:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": False,
                "include_availability": True,
                "include_alerts": False
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": True,
                "include_interventions": True
            },
            "team_performance": {
                "enabled": True,
                "include_time_spent": True,
                "include_by_technician": True
            }
        },
        "period": "previous_week"
    },
    
    "DIRECTION": {
        "name": "Rapport Mensuel Direction",
        "description": "Rapport mensuel de synthèse pour la Direction : vue d'ensemble de tous les indicateurs.",
        "schedule": {
            "frequency": "monthly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "07:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": True,
                "include_broken": True,
                "include_maintenance": True,
                "include_availability": True,
                "include_alerts": True
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": True,
                "include_interventions": True
            },
            "team_performance": {
                "enabled": True,
                "include_time_spent": True,
                "include_by_technician": True
            }
        },
        "period": "previous_month"
    },
    
    "ADV": {
        "name": "Rapport Hebdo ADV",
        "description": "Rapport hebdomadaire du service Administration des Ventes.",
        "schedule": {
            "frequency": "weekly",
            "day_of_week": "monday",
            "day_of_month": 1,
            "month_of_year": 1,
            "time": "08:00",
            "timezone": "Europe/Paris"
        },
        "sections": {
            "work_orders": {
                "enabled": True,
                "include_created": True,
                "include_completed": True,
                "include_overdue": True,
                "include_in_progress": True,
                "include_completion_rate": True
            },
            "equipment": {
                "enabled": False,
                "include_broken": False,
                "include_maintenance": False,
                "include_availability": False,
                "include_alerts": False
            },
            "pending_requests": {
                "enabled": True,
                "include_improvements": True,
                "include_purchases": True,
                "include_interventions": False
            },
            "team_performance": {
                "enabled": False,
                "include_time_spent": False,
                "include_by_technician": False
            }
        },
        "period": "previous_week"
    }
}

# Template générique pour les services non définis
DEFAULT_GENERIC_TEMPLATE: Dict[str, Any] = {
    "name": "Rapport Hebdo {service}",
    "description": "Rapport hebdomadaire automatique du service {service}.",
    "schedule": {
        "frequency": "weekly",
        "day_of_week": "monday",
        "day_of_month": 1,
        "month_of_year": 1,
        "time": "08:00",
        "timezone": "Europe/Paris"
    },
    "sections": {
        "work_orders": {
            "enabled": True,
            "include_created": True,
            "include_completed": True,
            "include_overdue": True,
            "include_in_progress": True,
            "include_completion_rate": True
        },
        "equipment": {
            "enabled": True,
            "include_broken": True,
            "include_maintenance": True,
            "include_availability": True,
            "include_alerts": True
        },
        "pending_requests": {
            "enabled": True,
            "include_improvements": True,
            "include_purchases": True,
            "include_interventions": True
        },
        "team_performance": {
            "enabled": True,
            "include_time_spent": True,
            "include_by_technician": True
        }
    },
    "period": "previous_week"
}


def get_template_for_service(service: str) -> Dict[str, Any]:
    """
    Retourne le template pré-configuré pour un service donné.
    Si le service n'a pas de template spécifique, utilise le template générique.
    """
    # Normaliser le nom du service (majuscules pour correspondance)
    service_upper = service.upper()
    
    if service_upper in DEFAULT_REPORT_TEMPLATES:
        template = DEFAULT_REPORT_TEMPLATES[service_upper].copy()
    else:
        # Utiliser le template générique
        template = DEFAULT_GENERIC_TEMPLATE.copy()
        template["name"] = template["name"].format(service=service)
        template["description"] = template["description"].format(service=service)
    
    return template


async def create_default_template_for_service(
    db,
    service: str,
    created_by: str,
    created_by_name: str = "Système"
) -> Dict[str, Any]:
    """
    Crée le template par défaut pour un service.
    Retourne le template créé ou None si un template existe déjà.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Vérifier si un template existe déjà pour ce service
    existing = await db.weekly_report_templates.find_one({"service": service})
    if existing:
        logger.info(f"📊 Template déjà existant pour le service {service}, pas de création")
        return None
    
    # Obtenir le template pré-configuré
    template_config = get_template_for_service(service)
    
    # Créer le document complet
    template_data = {
        "id": str(uuid.uuid4()),
        "name": template_config["name"],
        "description": template_config["description"],
        "service": service,
        "is_active": False,  # Inactif par défaut, le responsable l'active s'il le souhaite
        "schedule": template_config["schedule"],
        "recipients": {
            "emails": [],
            "include_service_managers": True  # Inclut automatiquement le responsable
        },
        "sections": template_config["sections"],
        "period": template_config["period"],
        "created_by": created_by,
        "created_by_name": created_by_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_sent_at": None,
        "send_count": 0,
        "is_default_template": True  # Marqueur pour identifier les templates auto-générés
    }
    
    await db.weekly_report_templates.insert_one(template_data)
    
    logger.info(f"📊 Template par défaut créé pour le service {service}: {template_data['name']}")
    
    # Retourner sans _id MongoDB
    template_data.pop("_id", None)
    return template_data


async def create_default_templates_for_all_services(db, created_by: str = "system") -> List[Dict[str, Any]]:
    """
    Crée les templates par défaut pour tous les services qui n'en ont pas encore.
    Utilisé pour l'initialisation ou la mise à jour du système.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Récupérer tous les services distincts des utilisateurs
    services = await db.users.distinct("service", {"service": {"$ne": None, "$ne": ""}})
    
    created_templates = []
    
    for service in services:
        if not service:
            continue
            
        template = await create_default_template_for_service(
            db=db,
            service=service,
            created_by=created_by,
            created_by_name="Système"
        )
        
        if template:
            created_templates.append(template)
    
    logger.info(f"📊 {len(created_templates)} template(s) par défaut créé(s) pour {len(services)} service(s)")
    
    return created_templates


def get_available_default_templates() -> List[str]:
    """Retourne la liste des services ayant des templates pré-configurés"""
    return list(DEFAULT_REPORT_TEMPLATES.keys())
