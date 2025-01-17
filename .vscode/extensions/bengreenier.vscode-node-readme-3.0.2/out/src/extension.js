'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const npmdata_1 = require("./npmdata");
const localdata_1 = require("./localdata");
const remotedata_1 = require("./remotedata");
const parsers_1 = require("./parsers");
const vscode_1 = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let commands = [
        vscode.workspace.registerTextDocumentContentProvider(npmdata_1.NpmDataProvider.SchemaType, new npmdata_1.NpmDataProvider()),
        vscode.workspace.registerTextDocumentContentProvider(localdata_1.LocalDataProvider.SchemaType, new localdata_1.LocalDataProvider()),
        vscode.workspace.registerTextDocumentContentProvider(remotedata_1.RemoteDataProvider.SchemaType, new remotedata_1.RemoteDataProvider()),
        vscode.commands.registerCommand('nodeReadme.showReadme', () => {
            if (vscode.window.activeTextEditor == null) {
                vscode.window.showInputBox({
                    prompt: "Enter Module name"
                })
                    .then(findReadme);
            }
            else {
                const moduleName = scanDocument(vscode.window.activeTextEditor);
                if (moduleName) {
                    findReadme(moduleName, vscode.window.activeTextEditor);
                }
            }
        })
    ];
    context.subscriptions.push(...commands);
}
exports.activate = activate;
function scanDocument(textEditor) {
    const textDocument = textEditor.document;
    const langId = textDocument.languageId;
    if (langId === 'javascript' ||
        langId === 'typescript' ||
        langId === 'javascriptreact' ||
        langId === 'typescriptreact') {
        let pos = textEditor.selection.start;
        let line = textDocument.lineAt(pos.line);
        for (let i = 0; i < parsers_1.default.length; i++) {
            let moduleName = parsers_1.default[i](line, pos);
            if (moduleName) {
                return moduleName;
            }
        }
    }
}
function findReadme(moduleName, textEditor) {
    let isMultiRoot = false;
    // determine if we're vscode >= 1.18.0 (multiroot)
    if (vscode.workspace.getWorkspaceFolder) {
        isMultiRoot = true;
    }
    let localUris = [];
    if (textEditor && isMultiRoot) {
        const folder = vscode.workspace.getWorkspaceFolder(textEditor.document.uri);
        if (folder) {
            // we can search locally @ this path
            localUris = [folder.uri.with({ path: path.join(folder.uri.fsPath, "node_modules", moduleName, "readme.md") })];
        }
    }
    else if (isMultiRoot) {
        // we can search locally @ these paths
        localUris.push(vscode.workspace.workspaceFolders.map(f => f.uri.with({ path: path.join(f.uri.fsPath, "node_modules", moduleName, "readme.md") })));
    }
    else if (vscode.workspace.rootPath) {
        const folder = vscode.Uri.parse(`file://${vscode.workspace.rootPath}`);
        // we can search locally @ this path
        localUris = [folder.with({ path: path.join(folder.fsPath, "node_modules", moduleName, "readme.md") })];
    }
    // see if we have an override for it
    const overrides = vscode.workspace.getConfiguration("nodeReadme.overrides");
    if (overrides[moduleName]) {
        let uri = vscode_1.Uri.parse(overrides[moduleName]);
        if (uri.scheme === 'file') {
            uri = uri.with({
                authority: '',
                scheme: localdata_1.LocalDataProvider.SchemaType,
                // we unpack this in the data provider
                // but this enables us to have the moduleName is the tab title
                path: path.join(uri.authority, uri.path, moduleName)
            });
        }
        else {
            uri = uri.with({
                scheme: remotedata_1.RemoteDataProvider.SchemaType,
                // we unpack this in the data provider
                // but this enables us to have the moduleName is the tab title
                path: '/' + uri.scheme + "://" + path.join(uri.authority, uri.path, moduleName)
            });
        }
        // if we do just use the override
        return vscode.commands.executeCommand("markdown.showPreviewToSide", uri);
    }
    // see if we can find a local readme
    for (let i = 0; i < localUris.length; i++) {
        const uri = localUris[i];
        if (fs.existsSync(uri.fsPath)) {
            return vscode.commands.executeCommand("markdown.showPreviewToSide", uri.with({
                scheme: localdata_1.LocalDataProvider.SchemaType,
                // we unpack this in the data provider
                // but this enables us to have the moduleName is the tab title
                path: path.join(uri.path, moduleName)
            }));
        }
    }
    // otherwise, we can use our npmdata component to lookup and display the content
    //
    // authorities must be stripped, otherwise
    // https://github.com/Microsoft/vscode/blob/87c24f2b2633ae0652caac1f0df9acadb3271f5e/extensions/markdown/src/previewContentProvider.ts#L40
    // throws and breaks all the things
    const uri = vscode.Uri.parse(`${npmdata_1.NpmDataProvider.SchemaType}://npmjs.org/${moduleName}`).with({
        authority: null
    });
    return vscode.commands.executeCommand("markdown.showPreviewToSide", uri);
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map