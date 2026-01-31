import { useState } from "react";
import { Plus, X, Pencil, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useTerminalStore } from "@/stores/terminal-store";
import { cn } from "@/lib/utils";

export function GroupTabs() {
  const {
    groups,
    activeGroupId,
    setActiveGroup,
    addGroup,
    removeGroup,
    renameGroup,
    getTerminalsInGroup,
    terminals,
  } = useTerminalStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const groupList = Array.from(groups.values());
  const allTerminalsCount = terminals.size;

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      renameGroup(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const newId = addGroup(newGroupName.trim());
      setActiveGroup(newId);
      setNewGroupName("");
      setIsAddingGroup(false);
    }
  };

  const handleRemoveGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeGroup(id);
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-background/50 border-b overflow-x-auto">
      {/* All Terminals Tab */}
      <button
        onClick={() => setActiveGroup(null)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
          activeGroupId === null
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        All
        <span className="text-xs opacity-70">({allTerminalsCount})</span>
      </button>

      {/* Group Tabs */}
      {groupList.map((group) => {
        const count = getTerminalsInGroup(group.id).length;
        const isEditing = editingId === group.id;
        const isActive = activeGroupId === group.id;

        return (
          <div
            key={group.id}
            onClick={() => !isEditing && setActiveGroup(group.id)}
            className={cn(
              "group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit(group.id);
                }}
                className="flex items-center gap-1"
              >
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-6 w-24 text-xs"
                  autoFocus
                  onBlur={() => handleSaveEdit(group.id)}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </form>
            ) : (
              <>
                <span>{group.name}</span>
                <span className="text-xs opacity-70">({count})</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(group.id, group.name);
                    }}
                    className="p-0.5 hover:bg-white/10 rounded"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {group.id !== "default" && (
                    <button
                      onClick={(e) => handleRemoveGroup(group.id, e)}
                      className="p-0.5 hover:bg-white/10 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Add Group */}
      {isAddingGroup ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddGroup();
          }}
          className="flex items-center gap-1"
        >
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="h-7 w-28 text-xs"
            autoFocus
            onBlur={() => {
              if (!newGroupName.trim()) {
                setIsAddingGroup(false);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            disabled={!newGroupName.trim()}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              setIsAddingGroup(false);
              setNewGroupName("");
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </form>
      ) : (
        <Button
          onClick={() => setIsAddingGroup(true)}
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
