import { ToolTileModelType } from "../../../models/tools/tool-tile";
import { IToolApiInterface } from "../tool-tile";

export interface SizeMeProps {
  size?: {
    width: number | null;
    height: number | null;
  };
}

export interface IActionHandlers {
  handleCut: () => void;
  handleCopy: () => void;
  handlePaste: () => void;
  handleDuplicate: () => void;
  handleDelete: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleToggleVertexAngle: () => void;
  handleCreateMovableLine: () => void;
  handleCreateComment: () => void;
}

export interface IGeometryProps extends SizeMeProps {
  context: string;
  scale?: number;
  tabIndex?: number;
  model: ToolTileModelType;
  readOnly?: boolean;
  toolApiInterface?: IToolApiInterface;
  onSetCanAcceptDrop: (tileId?: string) => void;
}
