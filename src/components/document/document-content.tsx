import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "../base";
import { DocumentContentModelType } from "../../models/document/document-content";
import { TileRowComponent, kDragResizeRowId, extractDragResizeRowId, extractDragResizeY,
        extractDragResizeModelHeight, extractDragResizeDomHeight } from "../document/tile-row";
import { kDragTileSource, kDragTileId, kDragTileContent,
        dragTileSrcDocId, kDragRowHeight } from "../tools/tool-tile";

import "./document-content.sass";

interface IProps extends IBaseProps {
  context: string;
  content?: DocumentContentModelType;
  readOnly?: boolean;
  scale?: number;
}

interface IDragResizeRow {
  id: string;
  modelHeight?: number;
  domHeight?: number;
  deltaHeight: number;
}

interface IDropRowInfo {
  rowInsertIndex: number;
  rowDropIndex?: number;
  rowDropLocation?: string;
  dropOffsetLeft?: number;
  dropOffsetTop?: number;
  dropOffsetRight?: number;
  dropOffsetBottom?: number;
  updateTimestamp?: number;
}

interface IState {
  dragResizeRow?: IDragResizeRow;
  dropRowInfo?: IDropRowInfo;
}
// Interval in ms between recalculation for highlighting drag/drop zones
const kDragUpdateInterval = 50;

@inject("stores")
@observer
export class DocumentContentComponent extends BaseComponent<IProps, IState> {

  public state: IState = {};

  private domElement: HTMLElement | null;
  private mutationObserver: MutationObserver;

  public componentDidMount() {
    if (this.domElement && (window as any).MutationObserver) {
      this.mutationObserver = new MutationObserver(this.handleRowElementsChanged);
      this.mutationObserver.observe(this.domElement, { childList: true });
    }
  }

  public componentWillUnmount() {
    this.mutationObserver.disconnect();
  }

  public render() {
    return (
      <div className="document-content"
        onClick={this.handleClick}
        onDragOver={this.handleDragOver}
        onDragLeave={this.handleDragLeave}
        onDrop={this.handleDrop}
        ref={(elt) => this.domElement = elt}
      >
        {this.renderRows()}
        {this.props.children}
      </div>
    );
  }

  private getRowHeight(rowId: string) {
    const { content } = this.props;
    if (!content) return;
    const { rowMap } = content;
    const row = rowMap.get(rowId);
    const { dragResizeRow } = this.state;
    const dragResizeRowId = dragResizeRow && dragResizeRow.id;
    if (rowId !== dragResizeRowId) {
      return row && row.height;
    }
    const rowHeight = dragResizeRow && (dragResizeRow.domHeight || dragResizeRow.modelHeight);
    if (!dragResizeRow || !rowHeight) return;
    return rowHeight + dragResizeRow.deltaHeight;
  }

  private renderRows() {
    const { content, ...others } = this.props;
    if (!content) { return null; }
    const { rowMap, rowOrder, tileMap } = content;
    const { dropRowInfo } = this.state;
    let tabIndex = 1;
    return rowOrder.map((rowId, index) => {
      const row = rowMap.get(rowId);
      const rowHeight = this.getRowHeight(rowId);
      const dropHighlight = dropRowInfo && (dropRowInfo.rowDropIndex != null) &&
                            (dropRowInfo.rowDropIndex === index) &&
                            dropRowInfo.rowDropLocation
                              ? dropRowInfo.rowDropLocation
                              : undefined;
      const _tabIndex = tabIndex;
      tabIndex += row ? row.tiles.length : 0;
      return row
              ? <TileRowComponent key={row.id} docId={content.contentId} model={row}
                                  tabIndex={_tabIndex} height={rowHeight} tileMap={tileMap}
                                  dropHighlight={dropHighlight} {...others} />
              : null;
    });
  }

  private handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { ui } = this.stores;
    // deselect tiles on click on document background
    // click must be on DocumentContent itself, not bubble up from child
    if (e.target === e.currentTarget) {
      ui.setSelectedTile();
    }
  }

  private handleRowElementsChanged = (mutationsList: MutationRecord[], mutationsObserver: MutationObserver) => {
    if (!this.domElement) return;

    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        // auto-scroll to new tile rows
        if (mutation.addedNodes.length) {
          const newRow = mutation.addedNodes[mutation.addedNodes.length - 1] as Element;
          const newRowBounds = newRow.getBoundingClientRect();
          const contentBounds = this.domElement.getBoundingClientRect();
          const visibleContent = {
                  top: this.domElement.scrollTop,
                  bottom: this.domElement.scrollTop + contentBounds.height
                };
          const newRowInContent = {
                  top: newRowBounds.top - contentBounds.top + this.domElement.scrollTop,
                  bottom: newRowBounds.bottom - contentBounds.top + this.domElement.scrollTop
                };
          const kScrollTopMargin = 2;
          const kScrollBottomMargin = 10;
          if (newRowInContent.bottom > visibleContent.bottom) {
            this.domElement.scrollTop += newRowInContent.bottom + kScrollBottomMargin - visibleContent.bottom;
          }
          else if (newRowInContent.top < visibleContent.top) {
            this.domElement.scrollTop += newRowInContent.top - kScrollTopMargin - visibleContent.top;
          }
        }
      }
    }
  }

  private hasDragType(dataTransfer: DataTransfer, type: string) {
    return dataTransfer.types.findIndex(t => t === type) >= 0;
  }

  private getDragResizeRowInfo(e: React.DragEvent<HTMLDivElement>) {
    const { scale } = this.props;
    const rowId = extractDragResizeRowId(e.dataTransfer);
    const startY = extractDragResizeY(e.dataTransfer);
    const modelHeight = extractDragResizeModelHeight(e.dataTransfer);
    const _domHeight = extractDragResizeDomHeight(e.dataTransfer);
    const domHeight = _domHeight && _domHeight / (scale || 1);
    const deltaHeight = (e.clientY - (startY || 0)) / (scale || 1);
    if (rowId && (deltaHeight != null)) {
      const originalHeight = domHeight || modelHeight;
      const newHeight = originalHeight && originalHeight + deltaHeight;
      return { id: rowId, modelHeight, domHeight, deltaHeight, newHeight };
    }
  }

  private handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const { content, readOnly } = this.props;
    const { dropRowInfo } = this.state;
    if (!content || readOnly) return;

    const withinDocument = this.hasDragType(e.dataTransfer, dragTileSrcDocId(content.contentId));
    if (this.hasDragType(e.dataTransfer, kDragTileContent)) {
      // Throttle calculation rate slightly to reduce load while dragging
      const lastUpdate = dropRowInfo && dropRowInfo.updateTimestamp ? dropRowInfo.updateTimestamp : 0;
      const now = new Date().getTime();
      if (now - lastUpdate > kDragUpdateInterval) {
        const nextDropRowInfo = this.getDropRowInfo(e);
        this.setState({ dropRowInfo: nextDropRowInfo });
      }
      // indicate we'll accept the drop
      e.dataTransfer.dropEffect = withinDocument && !e.altKey ? "move" : "copy";
      e.preventDefault();
    }
    else if (withinDocument && this.hasDragType(e.dataTransfer, kDragResizeRowId)) {
      const dragResizeRow = this.getDragResizeRowInfo(e);
      if (dragResizeRow && dragResizeRow.id && dragResizeRow.newHeight != null) {
        this.setState({ dragResizeRow });
      }
      // indicate we'll accept the drop
      e.dataTransfer.dropEffect = "move";
      e.preventDefault();
    }
  }

  private handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (this.state.dropRowInfo) {
      this.setState({ dropRowInfo: undefined });
    }
  }

  private isPointInRect(x: number, y: number, rect: ClientRect | DOMRect) {
    if ((x == null) || !isFinite(x) || (y == null) || !isFinite(y)) return false;
    return ((x >= rect.left) && (x <= rect.right) && (y >= rect.top) && (y <= rect.bottom));
  }

  private getDropRowInfo = (e: React.DragEvent<HTMLDivElement>) => {
    const { content } = this.props;
    if (!this.domElement) return { rowInsertIndex: content ? content.rowOrder.length : 0 };

    const dropInfo: IDropRowInfo = {
      rowInsertIndex: 0
    };
    const rowElements = this.domElement.getElementsByClassName("tile-row");
    const dropY = e.clientY;
    let dropDistance = Infinity;
    let dist;
    for (let i = 0; i < rowElements.length; ++i) {
      const rowElt = rowElements[i];
      const rowBounds = rowElt.getBoundingClientRect();
      if (i === 0) {
        dist = Math.abs(dropY - rowBounds.top);
        dropInfo.rowInsertIndex = i;
        dropDistance = dist;
      }
      dist = Math.abs(dropY - rowBounds.bottom);
      if (dist < dropDistance) {
        dropInfo.rowInsertIndex = i + 1;
        dropDistance = dist;
      }
      if (this.isPointInRect(e.clientX, e.clientY, rowBounds) ||
          // below the last row - highlight bottom of last row
          ((i === rowElements.length - 1) && (e.clientY > rowBounds.bottom))) {
        dropInfo.rowDropIndex = i;
        dropInfo.dropOffsetLeft = Math.abs(e.clientX - rowBounds.left);
        dropInfo.dropOffsetTop = Math.abs(e.clientY - rowBounds.top);
        dropInfo.dropOffsetRight = Math.abs(rowBounds.right - e.clientX);
        dropInfo.dropOffsetBottom = Math.abs(rowBounds.bottom - e.clientY);

        const kSideDropThreshold = rowBounds.width * 0.25;
        if ((dropInfo.dropOffsetLeft < kSideDropThreshold) &&
            (dropInfo.dropOffsetLeft < dropInfo.dropOffsetRight!)) {
          dropInfo.rowDropLocation = "left";
        }
        else if ((dropInfo.dropOffsetRight < kSideDropThreshold) &&
                (dropInfo.dropOffsetRight <= dropInfo.dropOffsetLeft!)) {
          dropInfo.rowDropLocation = "right";
        }
        else if (dropInfo.dropOffsetTop < dropInfo.dropOffsetBottom) {
          dropInfo.rowDropLocation = "top";
        }
        else {
          dropInfo.rowDropLocation = "bottom";
        }
      }
    }
    dropInfo.updateTimestamp = new Date().getTime();
    return dropInfo;
  }

  private handleRowResizeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const { content } = this.props;
    const dragResizeRow = this.getDragResizeRowInfo(e);
    if (content && dragResizeRow && dragResizeRow.id && dragResizeRow.newHeight != null) {
      const row = content.rowMap.get(dragResizeRow.id);
      row && row.setRowHeight(dragResizeRow.newHeight);
      this.setState({ dragResizeRow: undefined });
    }
  }

  private handleMoveTileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const { content } = this.props;
    if (!content) return;
    const dragTileId = e.dataTransfer.getData(kDragTileId);
    const srcRowId = content.findRowContainingTile(dragTileId);
    if (!srcRowId) return;
    const srcRowIndex = content.rowOrder.findIndex(rowId => rowId === srcRowId);
    const dropRowInfo  = this.getDropRowInfo(e);
    const { rowInsertIndex, rowDropIndex, rowDropLocation } = dropRowInfo;
    if ((rowDropIndex != null) && (rowDropLocation === "left")) {
      content.moveTileToRow(dragTileId, rowDropIndex, 0);
      return;
    }
    if ((rowDropIndex != null) && (rowDropLocation === "right")) {
      content.moveTileToRow(dragTileId, rowDropIndex);
      return;
    }

    if ((srcRowIndex >= 0)) {
      // if only one tile in source row, move the entire row
      if (content.numTilesInRow(srcRowId) === 1) {
        if (rowInsertIndex !== srcRowIndex) {
          content.moveRowToIndex(srcRowIndex, rowInsertIndex);
        }
      }
      else {
        content.moveTileToNewRow(dragTileId, rowInsertIndex);
      }
    }
  }

  private handleCopyTileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const { content } = this.props;
    const dragTileContent = e.dataTransfer.getData(kDragTileContent);
    if (!content || !dragTileContent) return;
    const dragTileId = e.dataTransfer.getData(kDragTileId);
    const { rowInsertIndex } = this.getDropRowInfo(e);
    let dragRowHeight;
    if (e.dataTransfer.getData(kDragRowHeight)) {
      dragRowHeight = +e.dataTransfer.getData(kDragRowHeight);
    }
    content.copyTileIntoRow(dragTileContent, dragTileId, rowInsertIndex, dragRowHeight);
  }

  private handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const { content, readOnly } = this.props;
    const dragSrc = e.dataTransfer.getData(kDragTileSource);
    const dragTileId = e.dataTransfer.getData(kDragTileId);
    const dragTileContent = e.dataTransfer.getData(kDragTileContent);

    if (!content || readOnly) return;

    if (this.hasDragType(e.dataTransfer, kDragResizeRowId)) {
      this.handleRowResizeDrop(e);
      return;
    }

    e.preventDefault();

    // handle drop within document - reorder tiles/rows
    if (dragTileId && (dragSrc === content.contentId) && !e.altKey) {
      this.handleMoveTileDrop(e);
    }

    // handle drop - copy contents to new row
    else if (dragTileContent) {
      this.handleCopyTileDrop(e);
    }

    if (this.state.dropRowInfo) {
      this.setState({ dropRowInfo: undefined });
    }
  }

}