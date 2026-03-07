"""
Moteur de formules pour les widgets personnalisés
Supporte les opérations mathématiques de base, les fonctions d'agrégation,
et les comparaisons temporelles
"""
import re
import math
import logging
from typing import Dict, Any, List, Union, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class FormulaEngine:
    """
    Moteur d'évaluation de formules pour les widgets personnalisés
    
    Syntaxe supportée:
    - Opérations de base: +, -, *, /, %, ^
    - Parenthèses: (expression)
    - Fonctions: SUM(), AVG(), MIN(), MAX(), COUNT(), ABS(), ROUND()
    - Références sources: $source_name ou ${source_name}
    - Fonctions conditionnelles: IF(condition, then, else)
    - Comparaisons: >, <, >=, <=, ==, !=
    - Fonctions temporelles: VS_PREV_MONTH(), VS_PREV_YEAR(), GROWTH_RATE()
    """
    
    def __init__(self, sources: Dict[str, Any] = None):
        """
        Initialise le moteur avec les sources de données
        
        Args:
            sources: Dict {nom_source: valeur} pour les références
        """
        self.sources = sources or {}
        self.functions = {
            'SUM': self._fn_sum,
            'AVG': self._fn_avg,
            'AVERAGE': self._fn_avg,
            'MIN': self._fn_min,
            'MAX': self._fn_max,
            'COUNT': self._fn_count,
            'ABS': self._fn_abs,
            'ROUND': self._fn_round,
            'FLOOR': self._fn_floor,
            'CEIL': self._fn_ceil,
            'SQRT': self._fn_sqrt,
            'POW': self._fn_pow,
            'IF': self._fn_if,
            'IFERROR': self._fn_iferror,
            'CONCAT': self._fn_concat,
            'PERCENTAGE': self._fn_percentage,
            'VS_PREV_MONTH': self._fn_vs_prev_month,
            'VS_PREV_YEAR': self._fn_vs_prev_year,
            'GROWTH_RATE': self._fn_growth_rate,
        }
    
    def evaluate(self, formula: str) -> Union[float, str, bool, None]:
        """
        Évalue une formule et retourne le résultat
        
        Args:
            formula: Formule à évaluer (ex: "$source1 + $source2 * 100")
        
        Returns:
            Résultat de l'évaluation
        """
        try:
            # Nettoyer la formule
            formula = formula.strip()
            
            # Remplacer les références de sources par leurs valeurs
            formula = self._replace_source_references(formula)
            
            # Évaluer les fonctions
            formula = self._evaluate_functions(formula)
            
            # Évaluer l'expression finale
            result = self._safe_eval(formula)
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur évaluation formule '{formula}': {e}")
            raise ValueError(f"Erreur de formule: {str(e)}")
    
    def _replace_source_references(self, formula: str) -> str:
        """Remplace les références aux sources par leurs valeurs"""
        # Format ${source_name} ou $source_name
        def replace_ref(match):
            source_name = match.group(1) or match.group(2)
            if source_name in self.sources:
                value = self.sources[source_name]
                if value is None:
                    return "0"
                if isinstance(value, (int, float)):
                    return str(value)
                if isinstance(value, str):
                    # Si c'est une chaîne numérique
                    try:
                        return str(float(value))
                    except:
                        return f'"{value}"'
                if isinstance(value, (list, dict)):
                    return str(value)
                return str(value)
            raise ValueError(f"Source non trouvée: {source_name}")
        
        # Pattern pour ${source_name} ou $source_name
        pattern = r'\$\{(\w+)\}|\$(\w+)'
        return re.sub(pattern, replace_ref, formula)
    
    def _evaluate_functions(self, formula: str) -> str:
        """Évalue les fonctions dans la formule"""
        # Pattern pour les fonctions: FUNCTION(args)
        pattern = r'(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)'
        
        # Évaluer récursivement les fonctions imbriquées
        max_iterations = 50
        iteration = 0
        
        while re.search(pattern, formula) and iteration < max_iterations:
            iteration += 1
            
            def replace_function(match):
                func_name = match.group(1).upper()
                args_str = match.group(2)
                
                if func_name in self.functions:
                    # Parser les arguments
                    args = self._parse_arguments(args_str)
                    # Appeler la fonction
                    result = self.functions[func_name](args)
                    return str(result)
                else:
                    # Fonction inconnue, laisser tel quel
                    return match.group(0)
            
            formula = re.sub(pattern, replace_function, formula)
        
        return formula
    
    def _parse_arguments(self, args_str: str) -> List[Any]:
        """Parse les arguments d'une fonction"""
        if not args_str.strip():
            return []
        
        args = []
        current_arg = ""
        paren_depth = 0
        in_string = False
        string_char = None
        
        for char in args_str + ",":
            if char in '"\'':
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None
                current_arg += char
            elif char == '(' and not in_string:
                paren_depth += 1
                current_arg += char
            elif char == ')' and not in_string:
                paren_depth -= 1
                current_arg += char
            elif char == ',' and paren_depth == 0 and not in_string:
                arg = current_arg.strip()
                if arg:
                    # Essayer de convertir en nombre
                    try:
                        args.append(float(arg))
                    except:
                        # Enlever les guillemets si présents
                        if (arg.startswith('"') and arg.endswith('"')) or \
                           (arg.startswith("'") and arg.endswith("'")):
                            args.append(arg[1:-1])
                        else:
                            args.append(arg)
                current_arg = ""
            else:
                current_arg += char
        
        return args
    
    def _safe_eval(self, expression: str) -> Union[float, str, bool]:
        """Évalue une expression de manière sécurisée"""
        # Nettoyer l'expression
        expression = expression.strip()
        
        # Si c'est une chaîne entre guillemets
        if (expression.startswith('"') and expression.endswith('"')) or \
           (expression.startswith("'") and expression.endswith("'")):
            return expression[1:-1]
        
        # Remplacer les opérateurs
        expression = expression.replace('^', '**')
        
        # Vérifier que l'expression ne contient que des caractères autorisés
        allowed_pattern = r'^[\d\s\+\-\*\/\%\.\(\)\<\>\=\!\&\|True False]+$'
        if not re.match(allowed_pattern, expression, re.IGNORECASE):
            # Peut contenir des références non résolues
            raise ValueError(f"Expression invalide: {expression}")
        
        # Évaluer de manière sécurisée
        try:
            result = eval(expression, {"__builtins__": {}}, {"True": True, "False": False})
            return result
        except:
            raise ValueError(f"Impossible d'évaluer: {expression}")
    
    # === Fonctions mathématiques ===
    
    def _fn_sum(self, args: List) -> float:
        """Somme des arguments"""
        total = 0
        for arg in args:
            if isinstance(arg, (int, float)):
                total += arg
            elif isinstance(arg, list):
                total += sum(x for x in arg if isinstance(x, (int, float)))
        return total
    
    def _fn_avg(self, args: List) -> float:
        """Moyenne des arguments"""
        values = []
        for arg in args:
            if isinstance(arg, (int, float)):
                values.append(arg)
            elif isinstance(arg, list):
                values.extend(x for x in arg if isinstance(x, (int, float)))
        return sum(values) / len(values) if values else 0
    
    def _fn_min(self, args: List) -> float:
        """Minimum des arguments"""
        values = []
        for arg in args:
            if isinstance(arg, (int, float)):
                values.append(arg)
            elif isinstance(arg, list):
                values.extend(x for x in arg if isinstance(x, (int, float)))
        return min(values) if values else 0
    
    def _fn_max(self, args: List) -> float:
        """Maximum des arguments"""
        values = []
        for arg in args:
            if isinstance(arg, (int, float)):
                values.append(arg)
            elif isinstance(arg, list):
                values.extend(x for x in arg if isinstance(x, (int, float)))
        return max(values) if values else 0
    
    def _fn_count(self, args: List) -> int:
        """Compte le nombre d'éléments"""
        count = 0
        for arg in args:
            if isinstance(arg, list):
                count += len(arg)
            else:
                count += 1
        return count
    
    def _fn_abs(self, args: List) -> float:
        """Valeur absolue"""
        if args and isinstance(args[0], (int, float)):
            return abs(args[0])
        return 0
    
    def _fn_round(self, args: List) -> float:
        """Arrondi"""
        if not args:
            return 0
        value = args[0] if isinstance(args[0], (int, float)) else 0
        decimals = int(args[1]) if len(args) > 1 and isinstance(args[1], (int, float)) else 0
        return round(value, decimals)
    
    def _fn_floor(self, args: List) -> int:
        """Arrondi vers le bas"""
        if args and isinstance(args[0], (int, float)):
            return math.floor(args[0])
        return 0
    
    def _fn_ceil(self, args: List) -> int:
        """Arrondi vers le haut"""
        if args and isinstance(args[0], (int, float)):
            return math.ceil(args[0])
        return 0
    
    def _fn_sqrt(self, args: List) -> float:
        """Racine carrée"""
        if args and isinstance(args[0], (int, float)) and args[0] >= 0:
            return math.sqrt(args[0])
        return 0
    
    def _fn_pow(self, args: List) -> float:
        """Puissance"""
        if len(args) >= 2:
            base = args[0] if isinstance(args[0], (int, float)) else 0
            exp = args[1] if isinstance(args[1], (int, float)) else 0
            return math.pow(base, exp)
        return 0
    
    # === Fonctions conditionnelles ===
    
    def _fn_if(self, args: List) -> Any:
        """Condition IF(condition, then_value, else_value)"""
        if len(args) < 2:
            return 0
        
        condition = args[0]
        then_value = args[1]
        else_value = args[2] if len(args) > 2 else 0
        
        # Évaluer la condition si c'est une chaîne
        if isinstance(condition, str):
            condition = self._safe_eval(condition)
        
        return then_value if condition else else_value
    
    def _fn_iferror(self, args: List) -> Any:
        """Retourne la valeur de fallback en cas d'erreur"""
        if len(args) < 2:
            return 0
        
        try:
            value = args[0]
            if value is None or (isinstance(value, float) and math.isnan(value)):
                return args[1]
            return value
        except:
            return args[1]
    
    # === Fonctions de chaîne ===
    
    def _fn_concat(self, args: List) -> str:
        """Concatène des chaînes"""
        return "".join(str(arg) for arg in args)
    
    # === Fonctions de pourcentage ===
    
    def _fn_percentage(self, args: List) -> float:
        """Calcule un pourcentage: PERCENTAGE(part, total)"""
        if len(args) < 2:
            return 0
        part = args[0] if isinstance(args[0], (int, float)) else 0
        total = args[1] if isinstance(args[1], (int, float)) else 0
        if total == 0:
            return 0
        return round((part / total) * 100, 2)
    
    # === Fonctions de comparaison temporelle ===
    
    def _fn_vs_prev_month(self, args: List) -> float:
        """Compare avec le mois précédent: VS_PREV_MONTH(current, previous)"""
        if len(args) < 2:
            return 0
        current = args[0] if isinstance(args[0], (int, float)) else 0
        previous = args[1] if isinstance(args[1], (int, float)) else 0
        return current - previous
    
    def _fn_vs_prev_year(self, args: List) -> float:
        """Compare avec l'année précédente: VS_PREV_YEAR(current, previous)"""
        if len(args) < 2:
            return 0
        current = args[0] if isinstance(args[0], (int, float)) else 0
        previous = args[1] if isinstance(args[1], (int, float)) else 0
        return current - previous
    
    def _fn_growth_rate(self, args: List) -> float:
        """Calcule le taux de croissance: GROWTH_RATE(current, previous)"""
        if len(args) < 2:
            return 0
        current = args[0] if isinstance(args[0], (int, float)) else 0
        previous = args[1] if isinstance(args[1], (int, float)) else 0
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 2)


def evaluate_formula(formula: str, sources: Dict[str, Any]) -> Union[float, str, bool, None]:
    """
    Fonction utilitaire pour évaluer une formule
    
    Args:
        formula: Formule à évaluer
        sources: Dict des sources de données {nom: valeur}
    
    Returns:
        Résultat de l'évaluation
    """
    engine = FormulaEngine(sources)
    return engine.evaluate(formula)


def validate_formula(formula: str, available_sources: List[str]) -> Dict[str, Any]:
    """
    Valide une formule et retourne les erreurs éventuelles
    
    Args:
        formula: Formule à valider
        available_sources: Liste des noms de sources disponibles
    
    Returns:
        Dict avec 'valid' (bool) et 'errors' (list)
    """
    errors = []
    
    # Vérifier les références de sources
    source_refs = re.findall(r'\$\{?(\w+)\}?', formula)
    for ref in source_refs:
        if ref not in available_sources:
            errors.append(f"Source inconnue: ${ref}")
    
    # Vérifier les fonctions
    func_calls = re.findall(r'(\w+)\s*\(', formula)
    valid_functions = [
        'SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ABS', 'ROUND',
        'FLOOR', 'CEIL', 'SQRT', 'POW', 'IF', 'IFERROR', 'CONCAT',
        'PERCENTAGE', 'VS_PREV_MONTH', 'VS_PREV_YEAR', 'GROWTH_RATE'
    ]
    for func in func_calls:
        if func.upper() not in valid_functions:
            errors.append(f"Fonction inconnue: {func}")
    
    # Vérifier les parenthèses
    if formula.count('(') != formula.count(')'):
        errors.append("Parenthèses non équilibrées")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'sources_used': list(set(source_refs)),
        'functions_used': list(set(f.upper() for f in func_calls if f.upper() in valid_functions))
    }
