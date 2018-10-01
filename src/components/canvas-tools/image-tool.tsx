import * as React from "react";
import { observer, inject } from "mobx-react";
import { BaseComponent } from "../base";
import { ToolTileModelType } from "../../models/tools/tool-tile";
import { ImageContentModelType } from "../../models/tools/image/image-content";

import "./image-tool.sass";

interface IProps {
  context: string;
  model: ToolTileModelType;
  readOnly?: boolean;
}

@inject("stores")
@observer
export default class ImageToolComponent extends BaseComponent<IProps, {}> {

  public render() {
    const { readOnly, model: { id, content } } = this.props;
    const imageContent = content as ImageContentModelType;
    const editableClass = readOnly ? "read-only" : "editable";
    const classes = `image-tool ${editableClass}`;
    return (
      <div className={classes} style={this.containerStyle}>
        <img src={imageContent.url} style={this.imageStyle} />
      </div>
    );
  }

  private get containerStyle() {
    const content = this.props.model.content as ImageContentModelType;
    const result: any = {};
    if (typeof content.align !== "undefined") {
      result.textAlign = content.align;
    }
    return result;
  }

  private get imageStyle() {
    const content = this.props.model.content as ImageContentModelType;
    const result: any = {};
    if (typeof content.width !== "undefined") {
      result.width = content.width;
    }
    if (typeof content.height !== "undefined") {
      result.height = content.height;
    }
    return result;
  }
}