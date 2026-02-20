// Données mockées pour l'application FSAO

export const mockUsers = [
  { id: '1', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@example.com', role: 'ADMIN', telephone: '06 12 34 56 78', statut: 'actif' },
  { id: '2', nom: 'Dubois', prenom: 'Pierre', email: 'pierre.dubois@example.com', role: 'TECHNICIEN', telephone: '06 23 45 67 89', statut: 'actif' },
  { id: '3', nom: 'Bernard', prenom: 'Marie', email: 'marie.bernard@example.com', role: 'TECHNICIEN', telephone: '06 34 56 78 90', statut: 'actif' },
  { id: '4', nom: 'Petit', prenom: 'Luc', email: 'luc.petit@example.com', role: 'VISUALISEUR', telephone: '06 45 67 89 01', statut: 'actif' }
];

export const mockWorkOrders = [
  {
    id: '5823',
    titre: 'Réparer le moteur',
    description: 'Le moteur principal fait un bruit anormal',
    statut: 'EN_ATTENTE',
    priorite: 'AUCUNE',
    equipement: { id: '1', nom: 'Moteur Principal A' },
    assigneA: mockUsers[1],
    emplacement: { id: '1', nom: 'Zone de Production 1' },
    dateCreation: '2025-01-15',
    dateLimite: '2025-01-20',
    tempsEstime: 4,
    tempsReel: null
  },
  {
    id: '5822',
    titre: 'Mise à niveau de l\'installation',
    description: 'Mise à niveau nécessaire pour améliorer les performances',
    statut: 'EN_COURS',
    priorite: 'AUCUNE',
    equipement: { id: '2', nom: 'Système HVAC' },
    assigneA: mockUsers[1],
    emplacement: { id: '2', nom: 'Bâtiment Principal' },
    dateCreation: '2025-01-14',
    dateLimite: '2025-01-18',
    tempsEstime: 6,
    tempsReel: 3
  },
  {
    id: '5821',
    titre: 'Changer les ampoules',
    description: 'Plusieurs ampoules sont grillées dans le hall',
    statut: 'OUVERT',
    priorite: 'AUCUNE',
    equipement: { id: '3', nom: 'Éclairage Hall' },
    assigneA: mockUsers[2],
    emplacement: { id: '3', nom: 'Hall d\'entrée' },
    dateCreation: '2025-01-13',
    dateLimite: '2025-01-17',
    tempsEstime: 2,
    tempsReel: null
  },
  {
    id: '5820',
    titre: 'Nettoyer les fenêtres',
    description: 'Nettoyage complet des vitres du bâtiment',
    statut: 'EN_COURS',
    priorite: 'AUCUNE',
    equipement: null,
    assigneA: mockUsers[2],
    emplacement: { id: '2', nom: 'Bâtiment Principal' },
    dateCreation: '2025-01-12',
    dateLimite: '2025-01-16',
    tempsEstime: 8,
    tempsReel: 4
  },
  {
    id: '5819',
    titre: 'Réparer le climatiseur',
    description: 'Le climatiseur ne refroidit plus correctement',
    statut: 'OUVERT',
    priorite: 'HAUTE',
    equipement: { id: '4', nom: 'Climatiseur Bureau' },
    assigneA: mockUsers[1],
    emplacement: { id: '4', nom: 'Bureau Direction' },
    dateCreation: '2025-01-11',
    dateLimite: '2025-01-15',
    tempsEstime: 3,
    tempsReel: null
  },
  {
    id: '5818',
    titre: 'Changer l\'huile',
    description: 'Vidange et changement d\'huile moteur',
    statut: 'TERMINE',
    priorite: 'AUCUNE',
    equipement: { id: '5', nom: 'Chariot élévateur' },
    assigneA: mockUsers[2],
    emplacement: { id: '5', nom: 'Entrepôt' },
    dateCreation: '2025-01-10',
    dateLimite: '2025-01-14',
    tempsEstime: 1,
    tempsReel: 1
  }
];

export const mockEquipments = [
  {
    id: '1',
    nom: 'Moteur Principal A',
    categorie: 'Machines',
    emplacement: { id: '1', nom: 'Zone de Production 1' },
    statut: 'OPERATIONNEL',
    dateAchat: '2020-05-12',
    coutAchat: 15000,
    numeroSerie: 'MOT-2020-001',
    garantie: '2 ans',
    derniereMaintenance: '2024-12-15'
  },
  {
    id: '2',
    nom: 'Système HVAC',
    categorie: 'Climatisation',
    emplacement: { id: '2', nom: 'Bâtiment Principal' },
    statut: 'EN_MAINTENANCE',
    dateAchat: '2019-03-22',
    coutAchat: 25000,
    numeroSerie: 'HVAC-2019-002',
    garantie: '5 ans',
    derniereMaintenance: '2025-01-10'
  },
  {
    id: '3',
    nom: 'Éclairage Hall',
    categorie: 'Électricité',
    emplacement: { id: '3', nom: 'Hall d\'entrée' },
    statut: 'OPERATIONNEL',
    dateAchat: '2021-08-15',
    coutAchat: 3500,
    numeroSerie: 'ECL-2021-003',
    garantie: '1 an',
    derniereMaintenance: '2024-11-20'
  },
  {
    id: '4',
    nom: 'Climatiseur Bureau',
    categorie: 'Climatisation',
    emplacement: { id: '4', nom: 'Bureau Direction' },
    statut: 'HORS_SERVICE',
    dateAchat: '2022-01-10',
    coutAchat: 4500,
    numeroSerie: 'CLIM-2022-004',
    garantie: '3 ans',
    derniereMaintenance: '2024-09-05'
  },
  {
    id: '5',
    nom: 'Chariot élévateur',
    categorie: 'Véhicules',
    emplacement: { id: '5', nom: 'Entrepôt' },
    statut: 'OPERATIONNEL',
    dateAchat: '2018-11-30',
    coutAchat: 18000,
    numeroSerie: 'CHAR-2018-005',
    garantie: '2 ans',
    derniereMaintenance: '2025-01-08'
  }
];

export const mockLocations = [
  { id: '1', nom: 'Zone de Production 1', adresse: '15 Rue de l\'Industrie', ville: 'Lyon', codePostal: '69001', type: 'Production' },
  { id: '2', nom: 'Bâtiment Principal', adresse: '22 Avenue des Champs', ville: 'Paris', codePostal: '75008', type: 'Bureau' },
  { id: '3', nom: 'Hall d\'entrée', adresse: '22 Avenue des Champs', ville: 'Paris', codePostal: '75008', type: 'Accueil' },
  { id: '4', nom: 'Bureau Direction', adresse: '22 Avenue des Champs', ville: 'Paris', codePostal: '75008', type: 'Bureau' },
  { id: '5', nom: 'Entrepôt', adresse: '88 Route de Marseille', ville: 'Marseille', codePostal: '13001', type: 'Stockage' }
];

export const mockInventory = [
  {
    id: '1',
    nom: 'Filtre à huile',
    reference: 'FIL-001',
    categorie: 'Filtres',
    quantite: 45,
    quantiteMin: 10,
    prixUnitaire: 12.50,
    fournisseur: 'Fournisseur A',
    emplacement: 'Entrepôt - Étagère A3'
  },
  {
    id: '2',
    nom: 'Courroie de transmission',
    reference: 'COU-002',
    categorie: 'Pièces mécaniques',
    quantite: 8,
    quantiteMin: 5,
    prixUnitaire: 45.00,
    fournisseur: 'Fournisseur B',
    emplacement: 'Entrepôt - Étagère B1'
  },
  {
    id: '3',
    nom: 'Ampoule LED 60W',
    reference: 'AMP-003',
    categorie: 'Électricité',
    quantite: 120,
    quantiteMin: 30,
    prixUnitaire: 5.50,
    fournisseur: 'Fournisseur C',
    emplacement: 'Entrepôt - Étagère C2'
  },
  {
    id: '4',
    nom: 'Huile moteur 5L',
    reference: 'HUI-004',
    categorie: 'Lubrifiants',
    quantite: 3,
    quantiteMin: 15,
    prixUnitaire: 28.00,
    fournisseur: 'Fournisseur A',
    emplacement: 'Entrepôt - Étagère A1'
  },
  {
    id: '5',
    nom: 'Vis assortiment',
    reference: 'VIS-005',
    categorie: 'Quincaillerie',
    quantite: 500,
    quantiteMin: 100,
    prixUnitaire: 0.20,
    fournisseur: 'Fournisseur D',
    emplacement: 'Entrepôt - Étagère D4'
  }
];

export const mockPreventiveMaintenance = [
  {
    id: '1',
    titre: 'Inspection mensuelle moteur',
    equipement: mockEquipments[0],
    frequence: 'MENSUEL',
    prochaineMaintenance: '2025-02-15',
    derniereMaintenance: '2025-01-15',
    assigneA: mockUsers[1],
    duree: 2,
    statut: 'ACTIF'
  },
  {
    id: '2',
    titre: 'Changement filtre HVAC',
    equipement: mockEquipments[1],
    frequence: 'TRIMESTRIEL',
    prochaineMaintenance: '2025-04-10',
    derniereMaintenance: '2025-01-10',
    assigneA: mockUsers[1],
    duree: 1,
    statut: 'ACTIF'
  },
  {
    id: '3',
    titre: 'Vérification éclairage',
    equipement: mockEquipments[2],
    frequence: 'HEBDOMADAIRE',
    prochaineMaintenance: '2025-01-22',
    derniereMaintenance: '2025-01-15',
    assigneA: mockUsers[2],
    duree: 0.5,
    statut: 'ACTIF'
  }
];

export const mockVendors = [
  {
    id: '1',
    nom: 'Fournisseur A',
    contact: 'Jean Dupont',
    email: 'contact@fournisseura.fr',
    telephone: '01 23 45 67 89',
    adresse: '10 Rue du Commerce, 75001 Paris',
    specialite: 'Pièces mécaniques'
  },
  {
    id: '2',
    nom: 'Fournisseur B',
    contact: 'Marie Leroy',
    email: 'info@fournisseurb.fr',
    telephone: '01 34 56 78 90',
    adresse: '25 Avenue Industrielle, 69002 Lyon',
    specialite: 'Équipements électriques'
  },
  {
    id: '3',
    nom: 'Fournisseur C',
    contact: 'Paul Martin',
    email: 'ventes@fournisseurc.fr',
    telephone: '01 45 67 89 01',
    adresse: '5 Boulevard des Lumières, 75008 Paris',
    specialite: 'Éclairage'
  }
];

export const mockAnalytics = {
  workOrdersParStatut: {
    OUVERT: 2,
    EN_COURS: 2,
    EN_ATTENTE: 1,
    TERMINE: 1
  },
  workOrdersParPriorite: {
    HAUTE: 1,
    MOYENNE: 0,
    BASSE: 0,
    AUCUNE: 5
  },
  equipementsParStatut: {
    OPERATIONNEL: 3,
    EN_MAINTENANCE: 1,
    HORS_SERVICE: 1
  },
  coutsMaintenance: {
    janvier: 4500,
    decembre: 3200,
    novembre: 2800,
    octobre: 3500,
    septembre: 2900,
    aout: 3100
  },
  tempsReponse: {
    moyen: 2.5,
    median: 2,
    min: 1,
    max: 6
  },
  tauxRealisation: 87,
  nombreMaintenancesPrev: 15,
  nombreMaintenancesCorrectives: 21
};