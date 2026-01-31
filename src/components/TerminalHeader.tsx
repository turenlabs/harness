import { X, Circle, Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import type { TerminalStatus, TerminalColor } from "@/types/terminal";

interface TerminalHeaderProps {
  title: string;
  status: TerminalStatus;
  color: TerminalColor;
  onClose: () => void;
  onRename: (newTitle: string) => void;
  onColorChange: (newColor: TerminalColor) => void;
}

const statusColors: Record<TerminalStatus, string> = {
  starting: "text-warning",
  running: "text-success",
  idle: "text-muted-foreground",
  error: "text-destructive",
};

const statusLabels: Record<TerminalStatus, string> = {
  starting: "Starting...",
  running: "Running",
  idle: "Idle",
  error: "Error",
};

const terminalColors: Record<TerminalColor, string> = {
  default: "bg-border",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

const headerColorClasses: Record<TerminalColor, string> = {
  default: "border-b-border",
  red: "border-b-red-500",
  orange: "border-b-orange-500",
  yellow: "border-b-yellow-500",
  green: "border-b-green-500",
  cyan: "border-b-cyan-500",
  blue: "border-b-blue-500",
  purple: "border-b-purple-500",
  pink: "border-b-pink-500",
};

const colorOptions: TerminalColor[] = ["default", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

export function TerminalHeader({ title, status, color, onClose, onRename, onColorChange }: TerminalHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (editValue.trim()) {
      onRename(editValue.trim());
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  return (
    <div className={cn("flex items-center justify-between px-3 py-2 bg-secondary/50 border-b-2", headerColorClasses[color])}>
      <div className="flex items-center gap-2">
        <Circle
          className={cn("w-3 h-3 fill-current", statusColors[status])}
        />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") {
                setEditValue(title);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium bg-background/50 border border-border rounded px-1 py-0.5 w-[150px] outline-none focus:border-primary"
          />
        ) : (
          <span
            className="text-sm font-medium truncate max-w-[200px] cursor-pointer hover:text-primary"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditValue(title);
              setIsEditing(true);
            }}
            title="Double-click to rename"
          >
            {title}
          </span>
        )}
        <span className="text-xs text-muted-foreground">({statusLabels[status]})</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="relative" ref={colorPickerRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            title="Change color"
          >
            <Palette className="h-4 w-4" />
          </Button>
          {showColorPicker && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg p-2 shadow-lg z-50 flex gap-1">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "w-5 h-5 rounded-full transition-transform hover:scale-110",
                    terminalColors[c],
                    color === c && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange(c);
                    setShowColorPicker(false);
                  }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
