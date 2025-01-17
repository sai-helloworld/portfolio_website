"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const coreNames = require("node-core-module-names");
class NpmDataProvider {
    provideTextDocumentContent(uri, token) {
        let packageJson;
        if (vscode.window.activeTextEditor) {
            // determine if we're vscode >= 1.18.0 (multiroot)
            if (vscode.workspace.getWorkspaceFolder) {
                const folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
                packageJson = folder.uri.with({ path: path.join(folder.uri.fsPath, "package.json") }).fsPath;
            }
            else {
                const folder = vscode.Uri.parse(`file://${vscode.workspace.rootPath}`);
                packageJson = folder.with({ path: path.join(folder.fsPath, "package.json") }).fsPath;
            }
        }
        let moduleName = uri.path.substr(1);
        let moduleVersion = null;
        if (packageJson) {
            let pkg = JSON.parse(fs.readFileSync(packageJson).toString());
            if (pkg["dependencies"] && pkg["dependencies"][moduleName]) {
                moduleVersion = pkg["dependencies"][moduleName];
            }
            else if (pkg["devDependencies"] && pkg["devDependencies"][moduleName]) {
                moduleVersion = pkg["devDependencies"][moduleName];
            }
        }
        return this.getReadme(moduleName, moduleVersion);
    }
    getReadme(moduleName, moduleVersion) {
        if (coreNames.indexOf(moduleName) >= 0) {
            return this.queryGithub(`https://api.github.com/repos/nodejs/node/contents/doc/api/${moduleName}.md`);
        }
        else {
            return this.queryNpm(moduleName, moduleVersion);
        }
    }
    queryNpm(moduleName, moduleVersion) {
        return new Promise((resolve, reject) => {
            request({
                url: `https://registry.npmjs.org/${moduleName}`,
                json: true
            }, (err, res, body) => {
                if (err || res.statusCode.toString()[0] !== "2") {
                    return reject(err || `Invalid statusCode ${res.statusCode}`);
                }
                // #8 TODO it's probably better to read your package.json first and only default to latest
                if (!body["dist-tags"] || !body["dist-tags"]["latest"]) {
                    return reject(new Error("Invalid registry response"));
                }
                var latestVer = moduleVersion || body["dist-tags"]["latest"];
                if (!body["versions"] || !body["versions"][latestVer]) {
                    return reject(new Error("Missing registry response data"));
                }
                if (!body["versions"][latestVer]["repository"] || !body["versions"][latestVer]["repository"]["url"]) {
                    return reject(new Error("Missing registry repository data"));
                }
                // a bad way to determine if the url is from github
                // TODO dreamup a better way
                let url = body["versions"][latestVer]["repository"]["url"];
                let parts = url.split("/");
                let githubUri = false;
                let githubParts = [];
                parts.forEach((p) => {
                    if (p === "github.com") {
                        githubUri = true;
                    }
                    else if (githubUri) {
                        if (p.endsWith(".git")) {
                            p = p.replace(".git", "");
                        }
                        githubParts.push(p);
                    }
                });
                githubParts.unshift("https://api.github.com/repos");
                githubParts.push("readme");
                if (!githubUri) {
                    return reject(new Error("Unsupported registry repository type"));
                }
                resolve(this.queryGithub(githubParts.join("/")));
            });
        });
    }
    queryGithub(url) {
        return new Promise((resolve, reject) => {
            // make a request to github for the docs
            request({
                url: url,
                headers: {
                    "User-Agent": "bengreenier/vscode-node-readme",
                    "Accept": "application/vnd.github.v3.raw"
                }
            }, (err, res, body) => {
                if (err || res.statusCode.toString()[0] !== "2") {
                    return reject(err || `Invalid statusCode ${res.statusCode}`);
                }
                resolve(body.toString());
            });
        });
    }
}
NpmDataProvider.SchemaType = "node-readme-npm-data";
exports.NpmDataProvider = NpmDataProvider;
//# sourceMappingURL=npmdata.js.map