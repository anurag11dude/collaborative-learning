import { inject, observer } from "mobx-react";
import * as React from "react";

import { BaseComponent, IBaseProps } from "./base";
import { DocumentModelType, DocumentTool } from "../models/document/document";
import { IToolApiMap } from "./tools/tool-tile";

import "./toolbar.sass";

interface IProps extends IBaseProps {
  document: DocumentModelType;
  toolApiMap: IToolApiMap;
}

@inject("stores")
@observer
export class ToolbarComponent extends BaseComponent<IProps, {}> {
  public render() {
    const handleClickTool = (tool: DocumentTool) => {
      return (e: React.MouseEvent<HTMLDivElement>) => {
        switch (tool) {
          case "delete":
            this.handleDelete();
            break;
          default:
            this.handleAddToolTile(tool);
            break;
        }
      };
    };
    return (
      <div className="toolbar">
        <div className="tool select" title="Select" onClick={handleClickTool("select")}>
          <svg className={`icon icon-select-tool`}>
            <use xlinkHref={`#icon-select-tool`} />
          </svg>
        </div>
        <div className="tool text" title="Text"
            onClick={handleClickTool("text")}
            onMouseEnter={this.highlightDropRow}
            onMouseLeave={this.removeDropRowHighlight}>
          <svg className={`icon icon-text-tool`}>
            <use xlinkHref={`#icon-text-tool`} />
          </svg>
        </div>
        <div className="tool geometry" title="Geometry"
            onClick={handleClickTool("geometry")}
            onMouseEnter={this.highlightDropRow}
            onMouseLeave={this.removeDropRowHighlight}>
          <svg className={`icon icon-geometry-tool`}>
            <use xlinkHref={`#icon-geometry-tool`} />
          </svg>
        </div>
        <div className="tool image" title="Image"
            onClick={handleClickTool("image")}
            onMouseEnter={this.highlightDropRow}
            onMouseLeave={this.removeDropRowHighlight}>
        <svg className={`icon icon-image-tool`}>
            <use xlinkHref={`#icon-image-tool`} />
          </svg>
        </div>
        <div className="tool drawing" title="Drawing"
            onClick={handleClickTool("drawing")}
            onMouseEnter={this.highlightDropRow}
            onMouseLeave={this.removeDropRowHighlight}>
          <svg className={`icon icon-drawing-tool`}>
            <use xlinkHref={`#icon-drawing-tool`} />
          </svg>
        </div>
        <div className="tool delete" title="Delete" onClick={handleClickTool("delete")}>
          <svg className={`icon icon-delete-tool`}>
            <use xlinkHref={`#icon-delete-tool`} />
          </svg>
        </div>
      </div>
    );
  }

  private highlightDropRow = () => {
    const { document } = this.props;
    const { content } = document;
    content.highlightLastVisibleRow(true);
  }

  private removeDropRowHighlight = () => {
    const { document } = this.props;
    const { content } = document;
    content.highlightLastVisibleRow(false);
  }

  private handleAddToolTile(tool: DocumentTool) {
    const { document } = this.props;
    const { ui } = this.stores;
    const rowTile = document.addTile(tool, tool === "geometry");
    if (rowTile && rowTile.tileId) {
      ui.setSelectedTileId(rowTile.tileId);
    }
  }

  private handleDelete() {
    const { document } = this.props;
    const { ui: { selectedTileId } } = this.stores;
    if (selectedTileId) {
      const toolApi = this.props.toolApiMap[selectedTileId];
      // if there is selected content inside the selected tile, delete it first
      if (toolApi && toolApi.hasSelection()) {
        toolApi.deleteSelection();
      }
      else {
        document.deleteTile(selectedTileId);
      }
    }
  }
}
