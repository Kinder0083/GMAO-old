/**
 * Handlers de commandes Adria
 * Résolution des entités (équipement, utilisateur, inventaire) et exécution des actions
 */
import api, { workOrdersAPI, equipmentsAPI, usersAPI, inventoryAPI } from '../../services/api';

// ==================== Helpers de résolution ====================

/** Résoudre un nom d'équipement en equipement_id */
export const resolveEquipmentId = async (equipementNom) => {
  if (!equipementNom) return null;
  try {
    const res = await equipmentsAPI.getAll();
    const list = res.data || [];
    const search = equipementNom.toLowerCase();
    const match = list.find(eq =>
      eq.nom?.toLowerCase().includes(search) ||
      eq.reference?.toLowerCase().includes(search)
    );
    return match?.id || null;
  } catch (err) {
    console.warn('Impossible de résoudre l\'équipement:', err);
    return null;
  }
};

/** Résoudre un nom de technicien en assigne_a_id */
export const resolveUserId = async (userName) => {
  if (!userName) return null;
  try {
    const res = await usersAPI.getAll();
    const list = res.data || [];
    const search = userName.toLowerCase();
    const match = list.find(u => {
      const fullName = `${u.prenom || ''} ${u.nom || ''}`.toLowerCase();
      return fullName.includes(search) || u.nom?.toLowerCase().includes(search) || u.prenom?.toLowerCase().includes(search);
    });
    return match?.id || null;
  } catch (err) {
    console.warn('Impossible de résoudre le technicien:', err);
    return null;
  }
};

/** Résoudre des noms de pièces depuis l'inventaire */
export const resolveInventoryParts = async (pieces) => {
  if (!pieces || pieces.length === 0) return [];
  try {
    const res = await inventoryAPI.getAll();
    const invList = res.data || [];
    const results = [];
    for (const piece of pieces) {
      const pName = (piece.nom || piece).toLowerCase();
      const qty = piece.quantite || piece.quantity || 1;
      const invItem = invList.find(i =>
        i.nom?.toLowerCase().includes(pName) ||
        i.reference?.toLowerCase().includes(pName)
      );
      if (invItem) {
        results.push({
          payload: { inventory_item_id: invItem.id, inventory_item_name: invItem.nom, quantity: qty },
          label: `${invItem.nom} x${qty} (déduit du stock)`
        });
      } else {
        results.push({
          payload: { custom_part_name: piece.nom || piece, quantity: qty },
          label: `${piece.nom || piece} x${qty} (pièce externe)`
        });
      }
    }
    return results;
  } catch (err) {
    console.warn('Erreur résolution pièces:', err);
    return [];
  }
};

/** Chercher un OT par référence ou titre - priorité: numero exact > numero partiel > id > titre */
export const findWorkOrder = async (reference) => {
  const searchRef = (reference || '').replace('#', '').trim();
  if (!searchRef) return null;
  const res = await workOrdersAPI.getAll();
  const list = res.data || [];
  // Priorité 1: numéro exact
  const exactNumero = list.find(wo => wo.numero === searchRef);
  if (exactNumero) return exactNumero;
  // Priorité 2: numéro contient
  const partialNumero = list.find(wo => wo.numero?.includes(searchRef));
  if (partialNumero) return partialNumero;
  // Priorité 3: id contient
  const idMatch = list.find(wo => wo.id?.includes(searchRef));
  if (idMatch) return idMatch;
  // Priorité 4: titre contient
  const titreMatch = list.find(wo => wo.titre?.toLowerCase().includes(searchRef.toLowerCase()));
  if (titreMatch) return titreMatch;
  return null;
};

/** Parser un temps au format flexible (2h, 1h30, 2h30min, 1.5) → {hours, minutes} */
export const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const t = timeStr.toLowerCase().trim();
  let hours = 0, minutes = 0;
  const hMatch = t.match(/(\d+)\s*h/);
  const mMatch = t.match(/(\d+)\s*min/);
  if (hMatch) hours = parseInt(hMatch[1]);
  if (mMatch) minutes = parseInt(mMatch[1]);
  if (!hMatch && !mMatch) {
    const num = parseFloat(t);
    if (!isNaN(num)) { hours = Math.floor(num); minutes = Math.round((num - hours) * 60); }
  }
  return (hours > 0 || minutes > 0) ? { hours, minutes } : null;
};

// ==================== Handlers de commandes ====================

export const handleCreateOT = async (actionData) => {
  let otDesc = actionData.description || '';
  if (actionData.equipement_nom && !otDesc.includes(actionData.equipement_nom)) {
    otDesc += (otDesc ? '\n' : '') + `Equipement: ${actionData.equipement_nom}`;
  }
  const otPayload = {
    titre: actionData.titre,
    description: otDesc,
    priorite: (actionData.priorite || 'NORMALE').toUpperCase(),
    statut: 'OUVERT',
    dateLimite: new Date().toISOString(),
  };

  // Résolution équipement + emplacement automatique
  const eqId = await resolveEquipmentId(actionData.equipement_nom);
  if (eqId) {
    otPayload.equipement_id = eqId;
    // Récupérer l'emplacement de l'équipement
    try {
      const eqResponse = await api.get(`/equipments/${eqId}`);
      const eq = eqResponse.data;
      if (eq?.emplacement_id) {
        otPayload.emplacement_id = eq.emplacement_id;
        otPayload.emplacement = eq.emplacement;
      }
    } catch (e) {
      console.warn('Impossible de récupérer l\'emplacement:', e);
    }
  }

  // Temps estimé : valeur fournie ou 120 min (2h) par défaut
  if (actionData.tempsEstime || actionData.temps_estime) {
    otPayload.tempsEstime = parseFloat(actionData.tempsEstime || actionData.temps_estime);
  } else {
    otPayload.tempsEstime = 120;
  }

  if (actionData.categorie) otPayload.categorie = actionData.categorie;

  // Résolution de l'assignation
  let userId = await resolveUserId(actionData.assigne_a);
  // Fallback: si l'IA n'a pas inclus assigne_a mais que l'utilisateur courant est identifiable
  if (!userId && !actionData.assigne_a) {
    // Auto-assigner à l'utilisateur courant si disponible
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser?.id) {
        userId = currentUser.id;
        console.log('[Adria] Auto-assignation à l\'utilisateur courant:', currentUser.prenom, currentUser.nom);
      }
    } catch (e) { /* ignore */ }
  }
  if (userId) otPayload.assigne_a_id = userId;

  const otResponse = await (workOrdersAPI || api.workOrders).create(otPayload);
  window.dispatchEvent(new CustomEvent('gmao-data-refresh', { detail: { entity: 'work_orders', action: 'created' } }));
  return {
    success: true,
    message: `J'ai créé l'ordre de travail "${actionData.titre}" avec succès ! Numéro: #${otResponse.data?.id?.slice(-4) || 'XXXX'}`,
    toastTitle: 'Ordre de travail créé',
    toastDesc: `OT "${actionData.titre}" créé avec succès`
  };
};

export const handleModifyOT = async (actionData) => {
  const matchedWo = await findWorkOrder(actionData.ot_reference || actionData.titre);
  if (!matchedWo) {
    return { success: false, message: `Je n'ai pas trouvé d'ordre de travail correspondant à "${actionData.ot_reference || actionData.titre}". Pouvez-vous préciser le numéro ou le titre exact ?` };
  }
  const mods = actionData.modifications || {};
  const updatePayload = {};
  if (mods.priorite) updatePayload.priorite = mods.priorite.toUpperCase();
  if (mods.statut) updatePayload.statut = mods.statut.toUpperCase();
  if (mods.description) updatePayload.description = mods.description;
  if (mods.titre) updatePayload.titre = mods.titre;
  if (mods.categorie) updatePayload.categorie = mods.categorie.toUpperCase();
  if (mods.tempsEstime) updatePayload.tempsEstime = parseFloat(mods.tempsEstime);
  if (mods.dateLimite) updatePayload.dateLimite = mods.dateLimite;
  const eqId = await resolveEquipmentId(mods.equipement_nom);
  if (eqId) updatePayload.equipement_id = eqId;
  let userId = await resolveUserId(mods.assigne_a);
  if (!userId && mods.assigne_a) {
    // Fallback: essayer avec le nom complet
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentName = `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`.trim().toLowerCase();
      if (currentName && mods.assigne_a.toLowerCase().includes(currentName.split(' ')[0])) {
        userId = currentUser.id;
      }
    } catch (e) { /* ignore */ }
  }
  if (userId) updatePayload.assigne_a_id = userId;

  // Vérifier que le payload n'est pas vide
  if (Object.keys(updatePayload).length === 0) {
    console.warn('[Adria] handleModifyOT: aucune modification détectée dans', mods);
    return { success: false, message: `Je n'ai pas pu identifier les modifications à appliquer. Pouvez-vous reformuler votre demande ?` };
  }

  console.log('[Adria] handleModifyOT: updating OT', matchedWo.id, 'with', updatePayload);
  await workOrdersAPI.update(matchedWo.id, updatePayload);
  window.dispatchEvent(new CustomEvent('gmao-data-refresh', { detail: { entity: 'work_orders', action: 'updated' } }));
  const modDetails = Object.entries(updatePayload).map(([k, v]) => `${k}: ${v}`).join(', ');
  return {
    success: true,
    message: `J'ai modifié l'ordre de travail "${matchedWo.titre}" (${matchedWo.numero || '#' + matchedWo.id?.slice(-4)}) : ${modDetails}`,
    toastTitle: 'OT modifié',
    toastDesc: `OT "${matchedWo.titre}" mis à jour`
  };
};

export const handleCloseOT = async (actionData) => {
  const matchedWo = await findWorkOrder(actionData.ot_reference);
  if (!matchedWo) {
    return { success: false, message: `Je n'ai pas trouvé d'OT correspondant à "${actionData.ot_reference}". Pouvez-vous préciser ?` };
  }
  const woId = matchedWo.id;
  const resultParts = [];

  // 1. Ajouter le temps passé
  const time = parseTime(actionData.temps);
  if (time) {
    await workOrdersAPI.addTimeSpent(woId, time.hours, time.minutes);
    resultParts.push(`${time.hours}h${time.minutes > 0 ? time.minutes + 'min' : ''} de temps ajouté`);
  }

  // 2. Commentaire + pièces
  const commentText = actionData.commentaire || actionData.resume || 'OT clôturé via Adria';
  const resolvedParts = await resolveInventoryParts(actionData.pieces);
  resultParts.push(...resolvedParts.map(p => p.label));
  await api.post(`/work-orders/${woId}/comments`, {
    text: commentText,
    parts_used: resolvedParts.map(p => p.payload)
  });

  // 3. Statut TERMINE
  await workOrdersAPI.update(woId, { statut: 'TERMINE' });
  window.dispatchEvent(new CustomEvent('gmao-data-refresh', { detail: { entity: 'work_orders', action: 'updated' } }));

  const summary = [`OT "${matchedWo.titre}" clôturé`, ...resultParts].join('\n- ');
  return {
    success: true,
    message: `J'ai clôturé l'OT "${matchedWo.titre}" (${matchedWo.numero || '#' + woId.slice(-4)}) :\n- ${summary}`,
    toastTitle: 'OT clôturé',
    toastDesc: `"${matchedWo.titre}" terminé`
  };
};

export const handleConfigureAutomation = async (actionData) => {
  const parseRes = await api.post('/automations/parse', { message: actionData.message });
  const automation = parseRes.data?.automation;
  if (automation?.understood) {
    const applyRes = await api.post('/automations/apply', { automation });
    return {
      success: true,
      message: applyRes.data?.message || automation.confirmation_message || 'Automatisation mise en place !',
      toastTitle: 'Automatisation configurée',
      toastDesc: automation.name || 'Configuration réussie'
    };
  } else if (automation?.needs_clarification) {
    return { success: true, message: automation.clarification_question || 'J\'ai besoin de plus de détails pour configurer cette automatisation.' };
  }
  return { success: false, message: 'Impossible de comprendre la demande d\'automatisation.' };
};

export const handleCreateWidget = async (actionData) => {
  const widgetRes = await api.aiWidgets.generate({
    description: actionData.description,
    sensor_id: actionData.sensor_id || null,
    meter_id: actionData.meter_id || null
  });
  if (widgetRes.success) {
    window.dispatchEvent(new CustomEvent('gmao-data-refresh', { detail: { entity: 'custom_widgets', action: 'created' } }));
    return {
      success: true,
      message: `Widget "${widgetRes.widget?.name}" créé avec succès sur le Dashboard Service ! Vous pouvez le voir dans **Dashboard Service** dans le menu.`,
      toastTitle: 'Widget créé',
      toastDesc: `"${widgetRes.widget?.name}" ajouté au Dashboard Service`
    };
  }
  return { success: false, message: 'Impossible de créer le widget.' };
};

/**
 * Dispatcher principal — exécute la commande et retourne un résultat standardisé
 * @returns {{ success: boolean, message: string, toastTitle?: string, toastDesc?: string }}
 */
export const executeCommand = async (actionType, actionData) => {
  switch (actionType) {
    case 'CREATE_OT':
      return await handleCreateOT(actionData);
    case 'MODIFY_OT':
      return await handleModifyOT(actionData);
    case 'CLOSE_OT':
      return await handleCloseOT(actionData);
    case 'CONFIGURE_AUTOMATION':
      return await handleConfigureAutomation(actionData);
    case 'CREATE_WIDGET':
      return await handleCreateWidget(actionData);
    case 'ADD_TIME_OT':
      return { success: true, toastTitle: 'Temps ajouté', toastDesc: `${actionData.temps} ajouté sur ${actionData.ot_reference}` };
    case 'COMMENT_OT':
      return { success: true, toastTitle: 'Commentaire ajouté', toastDesc: `Commentaire ajouté sur ${actionData.ot_reference}` };
    case 'SEARCH':
      return { success: true, toastTitle: 'Recherche en cours', toastDesc: `Recherche dans ${actionData.type}...` };
    default:
      console.warn('Action non reconnue:', actionType);
      return { success: false, message: `Action "${actionType}" non reconnue.` };
  }
};
