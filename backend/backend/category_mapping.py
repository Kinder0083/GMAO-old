# Mapping des catégories basé sur le fichier Achats.xlsx
# Format: (ARTICLE, DM6) -> Catégorie
# CHAQUE COMBINAISON ARTICLE+DM6 EST UNIQUE

# Mapping basé sur ARTICLE + DM6 (pas juste Article!)
ARTICLE_DM6_TO_CATEGORY = {
    # Location
    ("LD", "YP61304"): "Location Mobilière Diverse",
    ("CD", "YP61305"): "Location Mobilière Diverse",
    ("LD", "YP61306"): "Location Mobilière",
    
    # Services
    ("YP61112", None): "Gardiennage",
    ("YP61109", None): "Informatique",
    ("YP61102", None): "Prestations diverses",
    
    # Maintenance - ATTENTION: YP61502 a plusieurs DM6 différents!
    ("YP61502", "I370500"): "Maintenance Constructions",
    ("YP61502", "I370900"): "Maintenance Constructions",
    ("YP61502", "I370200"): "Maintenance Véhicules",
    ("YP61502", "I370300"): "Maintenance Machines",  # CORRECTION ICI!
    ("YP61502", "I370100"): "Maintenance diverse",
    ("YP61502", None): "Prestation Entretien Installation labo",  # Fallback
    
    # Maintenance fournitures
    ("YP60612", None): "Maintenance - fournitures Entretien",
    ("YP60605", "I370500"): "Maintenance - Fournitures petit équipement",
    ("YP60605", "I380200"): "Maintenance - Fournitures petit équipement",
    
    # Nettoyage
    ("YP61504", None): "Nettoyage vêtements",
    ("YP61501", None): "Nettoyage locaux",
    
    # Consommables
    ("YP60608", None): "Matières consommables",
    ("YP60607", None): "Fourniture EPI",
    ("YP60606", None): "Fournitures de Bureau",
    
    # Transport
    ("YP62401", None): "Prestation Transport Sur Achat",
    ("YP62404", None): "Achat Transport Divers",
    
    # Production
    ("YP61103", None): "Prestation Externe Prod",
    
    # Investissements et divers
    ("AP23104", None): "Investissements",
    ("YP65801", None): "Divers à reclasser",
}

def get_category_from_article_dm6(article_code: str, dm6_code: str) -> str:
    """
    Retourne la catégorie basée sur ARTICLE + DM6.
    
    Args:
        article_code: Code article (ex: "YP61502")
        dm6_code: Code DM6 (ex: "I370300")
        
    Returns:
        Nom de la catégorie ou "Non catégorisé" si non trouvé
    """
    # Essayer avec le DM6 exact
    key = (article_code, dm6_code)
    if key in ARTICLE_DM6_TO_CATEGORY:
        return ARTICLE_DM6_TO_CATEGORY[key]
    
    # Fallback: essayer sans DM6 (None)
    key_fallback = (article_code, None)
    if key_fallback in ARTICLE_DM6_TO_CATEGORY:
        return ARTICLE_DM6_TO_CATEGORY[key_fallback]
    
    return "Non catégorisé"
