# Mapping des catégories basé sur le fichier Achats.xlsx
# Format: catégorie -> liste de codes DM6

CATEGORY_MAPPING = {
    "Location Mobilière Diverse": ["YP61304", "YP61305"],
    "Location Mobilière": ["YP61306"],
    "Gardiennage": ["YP61112"],
    "Informatique": ["YP61109"],
    "Prestations diverses": ["YP61102"],
    "Maintenance Constructions": ["YP61502"],
    "Maintenance Véhicules": ["YP61502"],
    "Maintenance diverse": ["YP61502"],
    "Prestation Entretien Installation labo": ["YP61502"],
    "Maintenance machines": ["YP61502"],
    "Maintenance - fournitures Entretien": ["YP60612"],
    "Maintenance - Fournitures petit équipement": ["YP60605"],
    "Nettoyage vêtements": ["YP61504"],
    "Nettoyage locaux": ["YP61501"],
    "Prestation Sous-Traitance générales / Diverse": ["YP61102"],
    "Matières consommables": ["YP60608"],
    "Matières consommables - LABO": ["YP60608"],
    "Fourniture EPI": ["YP60607"],
    "Fournitures de Bureau": ["YP60606"],
    "Prestation Transport Sur Achat": ["YP62401"],
    "Achat Transport Divers": ["YP62404"],
    "Prestation Externe Prod": ["YP61103"],
    "Investissements": ["AP23104"],
    "Divers à reclasser": ["YP65801"]
}

# Créer un mapping inversé: code Article → Catégorie
# Basé sur l'analyse du fichier Achats.xlsx fourni par l'utilisateur
ARTICLE_TO_CATEGORY = {}
for category, codes in CATEGORY_MAPPING.items():
    for code in codes:
        if code not in ARTICLE_TO_CATEGORY:
            ARTICLE_TO_CATEGORY[code] = category
        # Si le code existe déjà, on garde la première catégorie rencontrée

def get_category_from_article(article_code: str) -> str:
    """
    Retourne la catégorie d'un article basé sur son code article.
    
    Args:
        article_code: Code article (ex: "YP62404")
        
    Returns:
        Nom de la catégorie ou "Non catégorisé" si non trouvé
    """
    return ARTICLE_TO_CATEGORY.get(article_code, "Non catégorisé")

def get_all_categories() -> list:
    """Retourne la liste de toutes les catégories disponibles"""
    return list(CATEGORY_MAPPING.keys())
