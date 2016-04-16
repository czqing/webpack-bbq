import path from 'path';
import { createElement } from 'react';
import ReactDOMServer from 'react-dom/server';
import match from 'react-router/lib/match';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';

import config from '../config';
import App from './App';
import routes from './routes';
import reducers from './reducers';
import getChunkNames from './getChunkNames';

const rootReducer = combineReducers(reducers);
const storeEnhancer = applyMiddleware(thunkMiddleware);

export default (location, cb) => {
  const revisions = require('../app-revisions.json');
  const appName = expose(require.resolve('../src/'), `${config.basedir}/src/`);
  const initialState = {};
  const store = createStore(rootReducer, initialState, storeEnhancer);

  match({ location, routes }, (err, redirectLocation, renderProps) => {
    if (err) {
      return cb(err);
    }
    if (redirectLocation) {
      return cb(new Error(`redirectLocation: ${redirectLocation}`));
    }
    if (!renderProps) {
      const rerr = new Error(`match({ location: ${location} }): renderProps is missing`);
      rerr.statusCode = 404;
      return cb(rerr);
    }

    const el = createElement(App, { store, router: renderProps });
    const appHtml = ReactDOMServer.renderToString(el);

    const chunkNames = getChunkNames(renderProps.location);
    const stylesheets = [
      `<link href="${config.rootdir}${revisions[`${appName}.css`]}" rel="stylesheet" />`,
    ];
    const javascripts = [
      `<script src="${config.rootdir}${revisions[`${appName}.js`]}"></script>`,
    ]
    .concat(chunkNames.map((chunkName) => (
      `<script src="${config.rootdir}${revisions[`${chunkName}.js`]}"></script>`
    )))
    .concat([
      `<script>window[${JSON.stringify(appName)}](${JSON.stringify(store.getState())});</script>`,
    ]);

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>webpack-bbq</title>
    ${stylesheets.join('\n    ')}
  </head>
  <body>
    <div id="${appName}">${appHtml}</div>
    ${javascripts.join('\n    ')}
  </body>
</html>
    `;
    cb(null, html);
  });
};

function expose(filename, basedir) {
  const extname = path.extname(filename);
  const relname = path.relative(basedir, filename);
  return path.join(path.dirname(relname), path.basename(relname, extname));
}
