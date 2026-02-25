# NOTIFICATIONS PUSH ENVOYÉES PAR LE BACKEND FSAO — Guide d'intégration mobile

## Contexte

Le backend FSAO envoie des notifications push via l'API Expo Push (`https://exp.host/--/api/v2/push/send`).
Chaque notification contient un champ `data` avec un `type` qui identifie le type d'événement.
L'application mobile doit gérer ces notifications pour :
1. Les afficher même quand l'app est fermée ou en arrière-plan (via FCM/APNs)
2. Naviguer vers le bon écran quand l'utilisateur tape sur la notification

---

## Format général de chaque notification

```json
{
  "to": "ExponentPushToken[xxxxx]",
  "sound": "default",
  "title": "Titre de la notification",
  "body": "Corps du message",
  "priority": "high",
  "data": {
    "type": "TYPE_DE_NOTIFICATION",
    "...": "...champs spécifiques"
  }
}
```

---

## Liste complète des notifications envoyées par le backend

### 1. `work_order_assigned` — Nouveau BT assigné

**Quand :** Un bon de travail est créé ou réassigné à un utilisateur (sauf si l'utilisateur s'auto-assigne).

**Qui reçoit :** L'utilisateur assigné au BT.

**Format :**
```json
{
  "title": "Nouveau bon de travail assigne",
  "body": "#1234: Réparation pompe secteur A",
  "data": {
    "type": "work_order_assigned",
    "work_order_id": "699c198577c43fbca7d7d0c5",
    "work_order_numero": "1234"
  }
}
```

**Action mobile suggérée :** Naviguer vers l'écran de détail du bon de travail correspondant (`work_order_id`).

---

### 2. `work_order_status_changed` — Statut d'un BT modifié

**Quand :** Le statut d'un bon de travail change (ex: OUVERT → EN_COURS, EN_COURS → TERMINE, etc.).

**Qui reçoit :** Le créateur du BT ET l'utilisateur assigné, sauf celui qui a fait le changement.

**Format :**
```json
{
  "title": "Statut BT modifie",
  "body": "#1234 -> En cours",
  "data": {
    "type": "work_order_status_changed",
    "work_order_id": "699c198577c43fbca7d7d0c5",
    "work_order_numero": "1234",
    "old_status": "OUVERT",
    "new_status": "EN_COURS"
  }
}
```

**Valeurs possibles de `old_status` et `new_status` :**
- `OUVERT`
- `EN_COURS`
- `EN_ATTENTE`
- `TERMINE`
- `ANNULE`
- `CLOTURE`

**Action mobile suggérée :** Naviguer vers l'écran de détail du bon de travail (`work_order_id`).

---

### 3. `equipment_alert` — Alerte équipement

**Quand :** Un équipement passe au statut `HORS_SERVICE`.

**Qui reçoit :** Tous les utilisateurs avec le rôle `ADMIN` ou `TECHNICIEN` qui sont actifs.

**Format :**
```json
{
  "title": "[PANNE] Alerte equipement",
  "body": "Pompe hydraulique P-301: L'equipement est hors service",
  "data": {
    "type": "equipment_alert",
    "equipment_id": "698b1234abcdef5678901234",
    "alert_type": "PANNE"
  }
}
```

**Valeurs possibles de `alert_type` :** `PANNE`, `MAINTENANCE`, `ALERTE`, `INFO`

**Action mobile suggérée :** Naviguer vers l'écran de détail de l'équipement (`equipment_id`).

---

### 4. `chat_message` — Nouveau message privé

**Quand :** Un utilisateur envoie un message privé (avec `recipient_ids`) dans le chat live.

**Qui reçoit :** Les destinataires du message privé (pas l'expéditeur).

**Format :**
```json
{
  "title": "Jean Dupont",
  "body": "Bonjour, peux-tu vérifier la pompe...",
  "data": {
    "type": "chat_message"
  }
}
```

**Note :** Le body est tronqué à 50 caractères maximum. Les messages avec fichiers joints affichent "Fichier partage" comme body.

**Action mobile suggérée :** Naviguer vers l'écran du chat.

---

### 5. `test` — Notification de test

**Quand :** Un administrateur appuie sur le bouton de test depuis la fiche utilisateur dans l'app web, ou via l'endpoint `POST /api/notifications/test`.

**Qui reçoit :** L'utilisateur ciblé.

**Format :**
```json
{
  "title": "Test de notification",
  "body": "Les notifications fonctionnent correctement !",
  "data": {
    "type": "test"
  }
}
```

**Action mobile suggérée :** Aucune navigation, juste afficher la notification.

---

## Implémentation recommandée côté mobile

### Gestion des notifications reçues (foreground + background)

```javascript
import * as Notifications from 'expo-notifications';

// Configuration pour afficher les notifs même en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Quand l'utilisateur tape sur une notification
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  switch (data.type) {
    case 'work_order_assigned':
    case 'work_order_status_changed':
      // Naviguer vers le détail du BT
      navigation.navigate('WorkOrderDetail', { id: data.work_order_id });
      break;
      
    case 'equipment_alert':
      // Naviguer vers le détail de l'équipement
      navigation.navigate('EquipmentDetail', { id: data.equipment_id });
      break;
      
    case 'chat_message':
      // Naviguer vers le chat
      navigation.navigate('Chat');
      break;
      
    case 'test':
      // Rien de spécial
      break;
  }
});
```

### Résumé des types de notification

| `data.type` | Déclencheur | Qui reçoit | Navigation |
|---|---|---|---|
| `work_order_assigned` | Création/réassignation BT | Assigné (pas l'auteur) | Détail BT |
| `work_order_status_changed` | Changement statut BT | Créateur + assigné (pas l'auteur) | Détail BT |
| `equipment_alert` | Équipement HORS_SERVICE | Tous admins + techniciens | Détail équipement |
| `chat_message` | Message privé chat | Destinataires du message | Chat |
| `test` | Bouton test admin | Utilisateur ciblé | Aucune |

---

## Endpoints backend disponibles

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/notifications/register` | Enregistrer un token push (body: `{"push_token": "ExponentPushToken[xxx]", "platform": "android", "device_name": "..."}`) |
| `DELETE` | `/api/notifications/unregister?push_token=xxx` | Désactiver un token |
| `POST` | `/api/notifications/test` | Test notification vers l'utilisateur connecté |
| `GET` | `/api/notifications/devices` | Lister les appareils enregistrés (admin: tous, autre: les siens) |

Tous les endpoints nécessitent `Authorization: Bearer <JWT_TOKEN>`.
