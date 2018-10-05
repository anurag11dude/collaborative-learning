import * as React from "react";
import firebase from "firebase";
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

interface IState {
  currentFile?: File;
  imageUrl?: string;
  logOutput?: string;
}

@inject("stores")
@observer
export default class ImageToolComponent extends BaseComponent<IProps, {}> {

  public state: IState = {};

  public render() {
    const { readOnly, model } = this.props;
    const { content } = model;
    const { ui } = this.stores;
    const imageContent = content as ImageContentModelType;
    const editableClass = readOnly ? "read-only" : "editable";
    const selectedClass = ui.isSelectedTile(model) ? "selected" : "";
    const divClasses = `image-tool ${editableClass}`;
    const inputClasses = `image-url ${selectedClass}`;
    const fileInputClasses = `image-file ${selectedClass}`;
    const fileUploadClasses = `image-file-upload ${selectedClass}`;

    if (imageContent.storePath) {
      // Access token for url may have expired
      // Each time we load the control we need to check for the current tokenized url
      this.getUrlFromStore(imageContent.storePath);
    }
    return (
      <div className={divClasses} onMouseDown={this.handleMouseDown} >
        <img src={imageContent.url} />
        <input
          className={inputClasses}
          defaultValue={imageContent.url}
          onBlur={this.handleBlur}
          onKeyUp={this.handleKeyUp}
        />
        <input
          className={fileInputClasses}
          type="file"
          accept="image/png, image/jpeg"
          onChange={this.handleOnChange}
        />
        <button
          className={fileUploadClasses}
          onClick={this.handleUploadButton}>Upload</button>
        <div className="tempLogMessages">{this.state.logOutput}</div>
      </div>
    );
  }

  private getUrlFromStore(storePath: string) {
    const { db } = this.stores;
    const storage = db.firebase.firestore();
    const ref = storage.refFromURL(storePath);
    this.getUrlFromFirestore(ref);
  }

  private handleUploadButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { db } = this.stores;
    const { currentFile } = this.state;

    if (currentFile) {
      const ref = db.firebase.storeRef("/" + currentFile.name);
      ref.put(currentFile).then((snapshot) => {
        this.showMessage(`"${currentFile.name}" (${currentFile.size} bytes): ${snapshot.bytesTransferred} transferred`);
        if (currentFile) {
          const imageRef = db.firebase.storeRef().child(currentFile.name);
          this.getUrlFromFirestore(imageRef);
        }
      });
    }
  }
  private getUrlFromFirestore(imageRef: firebase.storage.Reference) {
    // Get the download URL - returns a url with an authentication token for the current session
    imageRef.getDownloadURL().then((url) => {
      this.showMessage(" image ref? " + imageRef.fullPath);
      this.updateURL(url, imageRef.fullPath);
    }).catch((error) => {
      switch (error.code) {
        case "storage/object-not-found":
          // File doesn't exist
          this.showMessage("file does not exist!");
          break;

        case "storage/unauthorized":
          // User doesn't have permission to access the object
          this.showMessage("You do not have permission");
          break;

        case "storage/canceled":
          // User canceled the upload
          this.showMessage("Upload cancelled");
          break;

        case "storage/unknown":
          // Unknown error occurred, inspect the server response
          this.showMessage("Unknown error uploading image");
          break;
      }
    });
  }
  private showMessage(message: string, append: boolean = false) {
    const { logOutput } = this.state;
    // TODO: Figure out user-friendly way to show information
    // console.log(message);
    let newOutput = message;
    if (logOutput && append) {
      newOutput = logOutput + "\n " + message;
    }
    this.setState({ logOutput: newOutput });
  }
  private handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files as FileList;
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const fileContent = fileReader.result;
      this.showMessage(`File Content of "${files[0].name}" (${files[0].size} bytes): ` + fileContent);
    };
    this.setState({ currentFile: files[0] });
  }

  private handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    this.stores.ui.setSelectedTile(this.props.model);
    const imageContent = this.props.model.content as ImageContentModelType;
    this.showMessage(imageContent.storePath + " " + imageContent.url);
  }

  private handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If we detect an enter key, treat the same way we handle losing focus,
    // i.e., attempt to change the URL for the image.
    if (e.keyCode === 13) {
      this.updateURL(e.currentTarget.value);
    }
  }

  private handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    this.updateURL(e.currentTarget.value);
  }

  private updateURL = (newUrl: string, storePath?: string) => {
    const imageContent = this.props.model.content as ImageContentModelType;
    imageContent.setUrl(newUrl);
    if (storePath) {
      imageContent.setStorePath(storePath);
      this.showMessage("---path set!--- " + storePath, true);
    }
  }
}
