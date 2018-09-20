import { observer } from "mobx-react";
import * as React from "react";
import { IBaseProps } from "./base";
import { DocumentContentModelType } from "../models/document-content";
import { ToolTileComponent } from "./canvas-tools/tool-tile";

import "./document-content.sass";

interface IProps extends IBaseProps {
  content?: DocumentContentModelType;
  readOnly?: boolean;
}

@observer
export class DocumentContentComponent extends React.Component<IProps, {}> {

  public render() {
    const { content } = this.props;
    const tileModels = content && content.tiles;
    const tiles = tileModels
                    ? tileModels.map((tile, index) => {
                        return <ToolTileComponent key={index} readOnly={this.props.readOnly} model={tile} />;
                      })
                    : null;
    return (
      <div className="document-content"
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
      >
        {tiles}
        {this.props.children}
      </div>
    );
  }

  private handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // indicate we'll accept the drop
    e.preventDefault();
  }

  private handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const { content } = this.props;
    const dragData = e.dataTransfer.getData("org.concord.clue.tile");
    let snapshot;
    if (content && dragData) {
      try {
        snapshot = JSON.parse(dragData);
      }
      catch (e) {
        snapshot = null;
      }
      if (snapshot) {
        content.addTileSnapshot(snapshot);
      }
    }
  }

}
