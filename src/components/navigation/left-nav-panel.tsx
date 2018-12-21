import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "../base";
import { CanvasComponent } from "../document/canvas";
import { SectionModelType } from "../../models/curriculum/section";
import { DocumentModelType } from "../../models/document/document";
import { DocumentContentModelType } from "../../models/document/document-content";

import "./left-nav-panel.sass";

interface IProps extends IBaseProps {
  section?: SectionModelType | null;
  isGhostUser: boolean;
}

@inject("stores")
@observer
export class LeftNavPanelComponent extends BaseComponent<IProps, {}> {
  private openDocumentButton: HTMLButtonElement | null;

  public render() {
    const { section } = this.props;

    return (
      <div className="left-nav-panel">
        {section ? this.renderSection(section) : null}
      </div>
    );
  }

  private renderSection(section: SectionModelType) {
    const {content} = section;
    return (
      <div className="section">
        <div className="section-header">
          <h1>{section.title}</h1>
        </div>
        {content ? this.renderContent(section, content) : null}
      </div>
    );
  }

  private renderContent(section: SectionModelType, content: DocumentContentModelType) {
    return (
      <CanvasComponent context="left-nav" readOnly={true} content={content}>
        <div className="buttons">
          <button
            ref={(el) => this.openDocumentButton = el}
            onClick={this.handleOpenDocument}
            data-test="open-document-button"
          >
            Open {section.title}
          </button>
        </div>
      </CanvasComponent>
    );
  }

  private handleOpenDocument = () => {
    const { db, ui, documents, user, groups } = this.stores;
    const { section, isGhostUser } = this.props;
    const { sectionWorkspace } = ui;

    if (section) {
      const document = documents.getSectionDocument(user.id, section.id);
      const done = (finalDocument: DocumentModelType) => {
        sectionWorkspace.toggleComparisonVisible({override: false, muteLog: true});
        sectionWorkspace.setComparisonDocument();
        sectionWorkspace.setPrimaryDocument(finalDocument);
        ui.contractAll();
        this.openDocumentButton!.disabled = false;
      };

      if (isGhostUser) {
        sectionWorkspace.setPrimaryGhostSection(section);
        ui.contractAll();
      }
      else {
        this.openDocumentButton!.disabled = true;
        if (document) {
          done(document);
        }
        else {
          db.createSectionDocument(section.id)
            .then(done)
            .catch(ui.setError);
        }
      }
    }
  }
}