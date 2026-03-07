import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

export function Combobox({ value, onValueChange, options, placeholder = "Sélectionner...", emptyText = "Aucun résultat.", className }) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleSelect = (currentValue) => {
    const newValue = currentValue === value ? "" : currentValue
    onValueChange(newValue)
    setOpen(false)
    setInputValue("")
  }

  const handleInputChange = (search) => {
    setInputValue(search)
  }

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      onValueChange(inputValue.trim().toUpperCase())
      setOpen(false)
      setInputValue("")
    }
  }

  // Filtrer les options selon la recherche
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Suggestions basées sur la similarité
  const getSuggestions = () => {
    if (!inputValue) return [];
    
    return options.filter(option => {
      const similarity = calculateSimilarity(inputValue.toLowerCase(), option.toLowerCase());
      return similarity > 0.5 && option.toLowerCase() !== inputValue.toLowerCase();
    }).slice(0, 3);
  }

  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = (s1, s2) => {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };

    return (longer.length - editDistance(longer, shorter)) / longer.length;
  }

  const suggestions = getSuggestions();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Rechercher ou créer..." 
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandEmpty>
            {inputValue ? (
              <div className="p-2">
                <p className="text-sm text-gray-500 mb-2">{emptyText}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleCreateNew}
                >
                  ✨ Créer "{inputValue.toUpperCase()}"
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-2">{emptyText}</p>
            )}
          </CommandEmpty>
          
          {/* Suggestions si écriture similaire */}
          {suggestions.length > 0 && inputValue && (
            <CommandGroup heading="📌 Suggestions (écriture proche)">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={handleSelect}
                  className="bg-yellow-50"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === suggestion ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {suggestion}
                  <span className="ml-auto text-xs text-yellow-600">Similaire</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Options existantes */}
          {filteredOptions.length > 0 && (
            <CommandGroup heading="Catégories existantes">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Option pour créer nouveau si on tape quelque chose */}
          {inputValue && !options.some(opt => opt.toLowerCase() === inputValue.toLowerCase()) && (
            <CommandGroup>
              <CommandItem onSelect={handleCreateNew} className="bg-blue-50">
                <span className="mr-2">✨</span>
                Créer la catégorie "{inputValue.toUpperCase()}"
              </CommandItem>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
