import * as React from "react";
import { observer, inject } from "mobx-react";
import { Alert, Intent } from "@blueprintjs/core";
import { BaseComponent } from "../../base";
import DataTableComponent, { LOCAL_ROW_ID } from "./data-table";
import { LinkedTableCellEditor } from "./linked-table-cell-editor";
import { IMenuItemFlags } from "./table-header-menu";
import { ColumnApi, GridApi, GridReadyEvent } from "ag-grid-community";
import { DataSet, IDataSet, ICase, ICaseCreation } from "../../../models/data/data-set";
import { ToolTileModelType } from "../../../models/tools/tool-tile";
import { canonicalizeValue, getRowLabel, isLinkableValue, ILinkProperties, ITableLinkProperties,
          TableContentModelType, TableMetadataModelType } from "../../../models/tools/table/table-content";
import { ValueGetterParams, ValueFormatterParams } from "ag-grid-community";
import { JXGCoordPair, JXGProperties } from "../../../models/tools/geometry/jxg-changes";
import { HotKeys } from "../../../utilities/hot-keys";
import { uniqueId } from "../../../utilities/js-utils";
import { each, sortedIndexOf } from "lodash";

import "./table-tool.sass";

interface IClipboardCases {
  attrs: Array<{ id: string, name: string }>;
  cases: ICase[];
}

interface IProps {
  model: ToolTileModelType;
  readOnly?: boolean;
  tabIndex?: number;  // required for focus()
}

// all properties are optional
interface IPartialState {
  metadata?: TableMetadataModelType;
  dataSet?: IDataSet;
  syncedChanges?: number;
  prevContent?: TableContentModelType;
  autoSizeColumns?: boolean;
}
​
// some properties are required
interface IState extends IPartialState {
  dataSet: IDataSet;
  syncedChanges: number;
  showInvalidPasteAlert: boolean;
}

@inject("stores")
@observer
export default class TableToolComponent extends BaseComponent<IProps, IState> {

  public static tileHandlesSelection = true;

  public static getDerivedStateFromProps = (props: IProps, state: IState) => {
    const { model: { content } } = props;
    const tableContent = content as TableContentModelType;
    const newState: IPartialState = {};
    if (content !== state.prevContent) {
      newState.prevContent = tableContent;
      newState.metadata = tableContent.metadata;
    }
    if (state.syncedChanges < tableContent.changes.length) {
      tableContent.applyChanges(state.dataSet, state.syncedChanges);
      newState.syncedChanges = tableContent.changes.length;
    }
    return newState;
  }

  public state: IState = {
                  dataSet: DataSet.create(),
                  syncedChanges: 0,
                  showInvalidPasteAlert: false
                };

  private domRef: React.RefObject<HTMLDivElement> = React.createRef();
  private hotKeys: HotKeys = new HotKeys();

  private gridApi?: GridApi;
  private gridColumnApi?: ColumnApi;

  public componentDidMount() {
    this.initializeHotKeys();

    if (this.domRef.current) {
      this.domRef.current.addEventListener("mousedown", this.handleMouseDown);
    }
  }

  public componentWillUnmount() {
    if (this.domRef.current) {
      this.domRef.current.removeEventListener("mousedown", this.handleMouseDown);
    }
  }

  public render() {
    const { readOnly } = this.props;
    const itemFlags: IMenuItemFlags = {
            addAttribute: false,
            addCase: true,
            addRemoveDivider: false,
            renameAttribute: true,
            removeAttribute: false,
            removeCases: true
          };
    return (
      <div className="table-tool" ref={this.domRef}
          tabIndex={this.props.tabIndex} onKeyDown={this.handleKeyDown} >
        <DataTableComponent
          dataSet={this.state.dataSet}
          metadata={this.getContent().metadata}
          changeCount={this.state.syncedChanges}
          autoSizeColumns={this.getContent().isImported}
          indexValueGetter={this.indexValueGetter}
          attrValueFormatter={this.attrValueFormatter}
          cellEditorComponent={LinkedTableCellEditor}
          cellEditorParams={{ metadata: this.getContent().metadata }}
          defaultPrecision={1}
          itemFlags={itemFlags}
          readOnly={readOnly}
          onGridReady={this.handleGridReady}
          onSetAttributeName={this.handleSetAttributeName}
          onSetEquation={this.handleSetEquation}
          onAddCanonicalCases={this.handleAddCanonicalCases}
          onSetCanonicalCaseValues={this.handleSetCanonicalCaseValues}
          onRemoveCases={this.handleRemoveCases}
        />
        {this.renderInvalidPasteAlert()}
      </div>
    );
  }

  private renderInvalidPasteAlert() {
    const { showInvalidPasteAlert } = this.state;
    if (!showInvalidPasteAlert) return;

    return (
      <Alert
          confirmButtonText="OK"
          icon="error"
          intent={Intent.DANGER}
          isOpen={true}
          onClose={this.handleCloseInvalidPasteAlert}
          canEscapeKeyCancel={true}
      >
        <p>
          Linked data must be numeric. Please edit the table values so that all pasted cells contain numbers.
        </p>
      </Alert>
    );
  }

  private handleCloseInvalidPasteAlert = () => {
    this.setState({ showInvalidPasteAlert: false });
  }

  private getContent() {
    return this.props.model.content as TableContentModelType;
  }

  private initializeHotKeys() {
    this.hotKeys.register({
      "cmd-c": this.handleCopy,
      "cmd-v": this.handlePaste
    });
  }

  private handleGridReady = (gridReadyParams: GridReadyEvent) => {
    this.gridApi = gridReadyParams.api || undefined;
    this.gridColumnApi = gridReadyParams.columnApi || undefined;
  }

  private handleMouseDown: EventListener = (e: MouseEvent) => {
    const target: HTMLElement = e.target as HTMLElement;
    const targetClasses = target && target.className;
    // don't mess with focus if this looks like something ag-grid has handled
    if (typeof targetClasses !== "string") return;
    if (targetClasses.includes("ag-cell") || targetClasses.includes("ag-header-cell")) {
      return;
    }

    // table tile should have keyboard focus -- requires tabIndex
    this.domRef.current && this.domRef.current.focus();

    // clicking on table background clears selection
    this.gridApi && this.gridApi.deselectAll();
    this.gridApi && this.gridApi.refreshCells();
  }

  private handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    this.hotKeys.dispatch(e);
  }

  private handleCopy = () => {
    const { dataSet } = this.state;
    if (this.gridApi && dataSet) {
      const sortedRowIds = this.gridApi.getSelectedNodes().map(row => row.id).sort();
      const rowIds = dataSet.cases.map(aCase => aCase.__id__).filter(id => sortedIndexOf(sortedRowIds, id) >= 0);
      if (rowIds && rowIds.length) {
        const { clipboard } = this.stores;
        const clipData = {
                attrs: dataSet.attributes.map(attr => ({ id: attr.id, name: attr.name })),
                cases: dataSet.getCanonicalCases(rowIds)
              };
        clipboard.clear();
        clipboard.addTileContent(this.props.model.id, this.getContent().type, clipData, this.stores);
      }
    }
  }

  private handlePaste = () => {
    const content = this.getContent();
    const { readOnly } = this.props;
    if (!readOnly && this.gridApi) {
      const { clipboard } = this.stores;
      const clipData: IClipboardCases = clipboard.getTileContent(content.type);
      if (clipData && clipData.cases && clipData.cases.length) {
        const attrCount = Math.min(this.state.dataSet.attributes.length, clipData.attrs.length);
        const attrMap: { [id: string]: string } = {};
        clipData.attrs.forEach((attr, i) => {
          if (i < attrCount) {
            attrMap[attr.id] = this.state.dataSet.attributes[i].id;
          }
        });
        let doesTableContainUnlinkableValues = false;
        const cases = clipData.cases.map(srcCase => {
          const dstCase: ICase = { __id__: uniqueId() };
          each(srcCase, (value, attrID) => {
            const dstAttrID = attrMap[attrID];
            if (dstAttrID) {
              dstCase[dstAttrID] = value;
              if (!isLinkableValue(value)) {
                doesTableContainUnlinkableValues = true;
              }
            }
          });
          return dstCase;
        });
        if (content.isLinked && doesTableContainUnlinkableValues) {
          this.setState({ showInvalidPasteAlert: true });
        }
        else {
          this.handleAddCanonicalCases(cases);
        }
      }
    }
  }

  private indexValueGetter = (params: ValueGetterParams) => {
    const { metadata } = this.state;
    return metadata && metadata.isLinked && (params.data.id !== LOCAL_ROW_ID)
            ? getRowLabel(params.node.rowIndex)
            : "";
  }

  private attrValueFormatter = (params: ValueFormatterParams) => {
    if ((params.value == null) || (params.value === "")) return params.value;
    const num = Number(params.value);
    return isFinite(num)
            ? num.toFixed(1).replace(".0", "")
            : params.value;
  }

  private getGeometryContent(geometryId: string) {
    return this.getContent().getGeometryContent(geometryId);
  }

  private getPositionOfPoint(caseId: string): JXGCoordPair {
    const { dataSet } = this.state;
    const attrCount = dataSet.attributes.length;
    const xAttr = attrCount > 0 ? dataSet.attributes[0] : undefined;
    const yAttr = attrCount > 1 ? dataSet.attributes[1] : undefined;
    // convert non-numeric values to 0
    const xValue = xAttr ? dataSet.getValue(caseId, xAttr.id) : 0;
    const yValue = yAttr ? dataSet.getValue(caseId, yAttr.id) : 0;
    return [canonicalizeValue(xValue), canonicalizeValue(yValue)];
  }

  private getTableActionLinks(): ILinkProperties | undefined {
    const linkedGeometries = this.getContent().metadata.linkedGeometries;
    if (!linkedGeometries || !linkedGeometries.length) return;
    const actionId = uniqueId();
    return { id: actionId, tileIds: [...linkedGeometries] };
  }

  private getGeometryActionLinks(links?: ILinkProperties, addLabelMap = false): ITableLinkProperties | undefined {
    if (!links || !links.id) return;
    return this.getContent().getClientLinks(links.id, this.state.dataSet, addLabelMap);
  }

  private getGeometryActionLinksWithLabels(links?: ILinkProperties) {
    return this.getGeometryActionLinks(links, true);
  }

  private handleSetAttributeName = (attributeId: string, name: string) => {
    const tableActionLinks = this.getTableActionLinks();
    this.getContent().setAttributeName(attributeId, name);
    setTimeout(() => {
      const geomActionLinks = this.getGeometryActionLinksWithLabels(tableActionLinks);
      this.getContent().metadata.linkedGeometries.forEach(id => {
        const geometryContent = this.getGeometryContent(id);
        if (geometryContent) {
          geometryContent.updateAxisLabels(undefined, this.props.model.id, geomActionLinks);
        }
      });
    });
  }

  private handleSetEquation = (attributeId: string, equation: string) => {
    this.getContent().setEquation(attributeId, equation);
    setTimeout(() => {
      const dataSet = this.state.dataSet;
      const tableActionLinks = this.getTableActionLinks();
      const geomActionLinks = this.getGeometryActionLinks(tableActionLinks);
      const ids: string[] = [];
      const props: JXGProperties[] = [];
      dataSet.cases.forEach(aCase => {
        const caseId = aCase.__id__;
        ids.push(caseId);
        const position = this.getPositionOfPoint(caseId) as JXGCoordPair;
        props.push({ position });
      });
      this.getContent().metadata.linkedGeometries.forEach(id => {
        const geometryContent = this.getGeometryContent(id);
        if (geometryContent) {
          geometryContent.updateObjects(undefined, ids, props, geomActionLinks);
        }
      });
    });
  }

  private handleAddCanonicalCases = (newCases: ICase[]) => {
    const validateCase = (aCase: ICase) => {
      const newCase: ICase = { __id__: uniqueId(), ...aCase };
      this.state.dataSet.attributes.forEach(attr => {
        if (this.getContent().isLinked) {
          const linkedValue = aCase[attr.id];
          newCase[attr.id] = isLinkableValue(linkedValue) ? linkedValue : 0;
        }
      });
      return newCase;
    };
    const cases = newCases.map(aCase => validateCase(aCase));
    const selectedRowIds = this.gridApi && this.gridApi.getSelectedNodes().map(row => row.id);
    const firstSelectedRowId = selectedRowIds && selectedRowIds.length && selectedRowIds[0] || undefined;
    const tableActionLinks = this.getTableActionLinks();
    this.getContent().addCanonicalCases(cases as ICaseCreation[], firstSelectedRowId, tableActionLinks);
    setTimeout(() => {
      const parents = cases.map(aCase => this.getPositionOfPoint(aCase.__id__));
      const props = cases.map(aCase => ({ id: aCase.__id__ }));
      const geomActionLinks = this.getGeometryActionLinksWithLabels(tableActionLinks);
      this.getContent().metadata.linkedGeometries.forEach(id => {
        const geometryContent = this.getGeometryContent(id);
        if (geometryContent) {
          geometryContent.addPoints(undefined, parents, props, geomActionLinks);
        }
      });
    });
  }

  private handleSetCanonicalCaseValues = (caseValues: ICase) => {
    const caseId = caseValues.__id__;
    const tableActionLinks = this.getTableActionLinks();
    this.getContent().setCanonicalCaseValues([caseValues], tableActionLinks);
    setTimeout(() => {
      const geomActionLinks = this.getGeometryActionLinks(tableActionLinks);
      this.getContent().metadata.linkedGeometries.forEach(id => {
        const newPosition = this.getPositionOfPoint(caseId);
        const position = newPosition as JXGCoordPair;
        const geometryContent = this.getGeometryContent(id);
        if (geometryContent) {
          geometryContent.updateObjects(undefined, caseId, { position }, geomActionLinks);
        }
      });
    });
  }

  private handleRemoveCases = (ids: string[]) => {
    const tableActionLinks = this.getTableActionLinks();
    this.getContent().removeCases(ids, tableActionLinks);
    setTimeout(() => {
      const geomActionLinks = this.getGeometryActionLinksWithLabels(tableActionLinks);
      this.getContent().metadata.linkedGeometries.forEach(id => {
        const geometryContent = this.getGeometryContent(id);
        if (geometryContent) {
          geometryContent.removeObjects(undefined, ids, geomActionLinks);
        }
      });
    });
  }
}
