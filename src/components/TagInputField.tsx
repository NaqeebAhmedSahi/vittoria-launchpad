import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputFieldProps {
  id: string;
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export function TagInputField({
  id,
  label,
  tags,
  onChange,
  placeholder,
  required,
  error,
  helperText,
  className,
}: TagInputFieldProps) {
  const [value, setValue] = useState("");

  const addTag = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.some(tag => tag.toLowerCase() === trimmed.toLowerCase())) {
      setValue("");
      return;
    }
    onChange([...tags, trimmed]);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      addTag();
    }
    if (event.key === "Backspace" && !value && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(item => item !== tag));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {required && <span className="text-xs text-muted-foreground">(required)</span>}
      </Label>

      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Button
          type="button"
          onClick={addTag}
          variant="secondary"
          disabled={!value.trim()}
        >
          Add
        </Button>
      </div>

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              type="button"
              key={tag}
              onClick={() => removeTag(tag)}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm text-foreground hover:bg-muted/80 transition-colors"
            >
              <span>{tag}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

