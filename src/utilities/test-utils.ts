import { each, isObject, isUndefined, unset } from "lodash";
import * as ReactDOMServer from "react-dom/server";

export const isUuid = (id: string) => {
  return /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/.test(id);
};

// Recursively removes properties whose values are undefined.
// The specified object is modified in place and returned.
// cf. https://stackoverflow.com/a/37250225
export const omitUndefined = (obj: {}) => {
  each(obj, (v, k) => {
    if (isUndefined(v)) {
      unset(obj, k);
    }
    else if (isObject(v)) {
      omitUndefined(v);
    }
  });
  return obj;
};

export const logComponent = (component: JSX.Element) => {
  // tslint:disable-next-line:no-console
  console.log(ReactDOMServer.renderToStaticMarkup(component));
};
