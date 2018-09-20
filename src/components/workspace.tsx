import { inject, observer } from "mobx-react";
import * as React from "react";

import { WorkspaceTool,
         WorkspaceModelType,
         SectionWorkspaceModelType,
         LearningLogWorkspaceModelType
       } from "../models/workspaces";
import { CanvasComponent } from "./canvas";
import { FourUpComponent } from "./four-up";
import { BaseComponent, IBaseProps } from "./base";

import "./workspace.sass";
import { SupportItemModelType } from "../models/supports";

export type WorkspaceSide = "primary" | "comparison";

interface IProps extends IBaseProps {
  workspace: WorkspaceModelType;
  side: WorkspaceSide;
  readOnly?: boolean;
}

@inject("stores")
@observer
export class WorkspaceComponent extends BaseComponent<IProps, {}> {

  public render() {
    return (
      <div className="workspace">
        {this.renderTitleBar()}
        {this.isPrimary() ? this.renderToolbar() : null}
        {this.renderCanvas()}
        {this.renderStatusBar()}
      </div>
    );
  }

  private renderTitleBar() {
    const { workspace } = this.props;
    if (workspace.type === "section") {
      return this.renderSectionTitleBar();
    }
    if (workspace.type === "learningLog") {
      return this.renderLearningLogTitleBar();
    }
  }

  private renderSectionTitleBar() {
    const {ui, problem} = this.stores;
    const workspace = this.sectionWorkspace;
    const activeSection = problem.getSectionById(workspace.sectionId);
    const show4up = !ui.comparisonWorkspaceVisible && !ui.bottomNavExpanded;
    return (
      <div className="titlebar">
        <div className="title">{activeSection ? `Section: ${activeSection.title}` : "Section"}</div>
        <div className="actions">
          <span className="share-button" onClick={this.handleToggleVisibility}>
            {workspace.visibility === "private" ? "Share" : "Unshare"}
          </span>
          {show4up
              ? <span onClick={this.handleToggleWorkspaceMode}>{workspace.mode === "1-up" ? "4-up" : "1-up"}</span>
              : null
          }
        </div>
      </div>
    );
  }

  private renderLearningLogTitleBar() {
    const workspace = this.learningLogWorkspace;
    return (
      <div className="titlebar">
        <div className="title">Learning Log: {workspace.title}</div>
        <div className="actions" />
      </div>
    );
  }

  private renderToolbar() {
    const { workspace } = this.props;
    const className = (tool: WorkspaceTool) => {
      return `tool ${tool}${tool === workspace.tool ? " active" : ""}`;
    };
    const handleSelectTool = (tool: WorkspaceTool) => {
      return (e: React.MouseEvent<HTMLDivElement>) => {
        workspace.selectTool(tool);
      };
    };
    return (
      <div className="toolbar">
        <div className={className("select")} title="Select" onClick={handleSelectTool("select")}>↖</div>
        <div className={className("text")} title="Text" onClick={handleSelectTool("text")}>T</div>
        <div className={className("geometry")} title="Geometry" onClick={handleSelectTool("geometry")}/>
      </div>
    );
  }

  private renderCanvas() {
    const { workspace } = this.props;
    if (workspace.type === "section") {
      return (
        <div className="canvas-area">
          {this.sectionWorkspace.mode === "1-up" ? this.render1UpCanvas(false) : this.render4UpCanvas()}
        </div>
      );
    }
    if (workspace.type === "learningLog") {
      return (
        <div className="canvas-area learning-log-canvas-area">
          {this.render1UpCanvas(true)}
        </div>
      );
    }
  }

  private render1UpCanvas(roundBottomRight: boolean) {
    return (
      <CanvasComponent document={this.props.workspace.document} readOnly={this.props.readOnly} />
    );
  }

  private render4UpCanvas() {
    return (
      <FourUpComponent workspace={this.sectionWorkspace} />
    );
  }

  private renderStatusBar() {
    const {workspace} = this.props;
    const isPrimary = this.isPrimary();
    const showContents = isPrimary && (workspace.type === "section");
    return (
      <div className="statusbar">
        <div className="supports">
          {showContents ? this.renderSupportIcons() : null}
          {showContents ? this.renderVisibleSupports() : null}
        </div>
        <div className="actions">
          {isPrimary ? this.renderTwoUpButton() : null}
        </div>
      </div>
    );
  }

  private renderTwoUpButton() {
    const {ui} = this.stores;
    if (this.props.workspace.type === "learningLog") {
      return <span onClick={this.handleToggleLLTwoUp}>{ui.llComparisonWorkspaceVisible ? "1-up" : "2-up"}</span>;
    }
    else if (this.sectionWorkspace.mode === "1-up") {
      return <span onClick={this.handleToggleTwoUp}>{ui.comparisonWorkspaceVisible ? "1-up" : "2-up"}</span>;
    }
  }

  private renderSupportIcons() {
    const supports = this.getSupportsWithIndices();
    return (
      <div className="supports-list">
        {supports.map((support) => {
          return (
            <span
              key={support.index}
              onClick={this.handleToggleSupport(support.item)}
              className={support.item.visible ? "active" : undefined}
            >
              {support.index}
            </span>
          );
        })}
      </div>
    );
  }

  private renderVisibleSupports() {
    const supports = this.getSupportsWithIndices().filter((supportWithIndex) => supportWithIndex.item.visible);
    if (supports.length === 0) {
      return null;
    }
    return (
      <div className="visible-supports">
        <div className="supports-list">
          {supports.map((support) => {
            return (
              <div key={support.index} onClick={this.handleToggleSupport(support.item)}>
                <span>{support.index}</span> {support.item.text}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  private handleToggleWorkspaceMode = () => {
    this.sectionWorkspace.toggleMode();
  }

  private handleToggleVisibility = () => {
    this.sectionWorkspace.toggleVisibility();
  }

  private handleToggleSupport = (support: SupportItemModelType) => {
    return () => this.stores.supports.toggleSupport(support);
  }

  private handleToggleTwoUp = () => {
    this.stores.ui.toggleComparisonWorkspaceVisible();
  }

  private handleToggleLLTwoUp = () => {
    this.stores.ui.toggleLLComparisonWorkspaceVisible();
  }

  private getSupportsWithIndices() {
    return this.stores.supports.getAllForSection(this.sectionWorkspace.sectionId).map((support, index) => {
      return {index: index + 1, item: support};
    });
  }

  private get sectionWorkspace() {
    return this.props.workspace as SectionWorkspaceModelType;
  }

  private get learningLogWorkspace() {
    return this.props.workspace as LearningLogWorkspaceModelType;
  }

  private isPrimary() {
    return this.props.side === "primary";
  }

}
