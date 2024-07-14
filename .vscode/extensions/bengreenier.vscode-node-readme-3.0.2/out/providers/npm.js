"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const coreNames = require("node-core-module-names");
const semver = require("semver");
const backoff = require("backoff");
const type_extensions_1 = require("../type-extensions");
const extension_1 = require("../extension");
class NpmProvider {
    provideTextDocumentContent(uri, token) {
        let packageJson;
        if (vscode.window.activeTextEditor &&
            vscode.window.activeTextEditor.document) {
            const folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
            if (folder) {
                packageJson = folder.uri.with({ path: path.join(folder.uri.fsPath, "package.json") }).fsPath;
            }
        }
        let moduleName = (() => { const p = type_extensions_1.ReadmeUri.from(uri).rawUri.path.split('/'); return p[p.length - 1]; })();
        let moduleVersion = null;
        if (packageJson && fs.existsSync(packageJson)) {
            let pkg = JSON.parse(fs.readFileSync(packageJson).toString());
            if (pkg["dependencies"] && pkg["dependencies"][moduleName]) {
                moduleVersion = pkg["dependencies"][moduleName];
            }
            else if (pkg["devDependencies"] && pkg["devDependencies"][moduleName]) {
                moduleVersion = pkg["devDependencies"][moduleName];
            }
        }
        return this.getReadme(moduleName, moduleVersion).then((p) => {
            extension_1.TestHook.log(uri.toString());
            return p;
        }, (err) => {
            extension_1.TestHook.err(err);
            return Promise.reject(err);
        });
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
        // we need to account for moduleNames with /  in them
        moduleName = moduleName.replace(/\//g, '%2f');
        return this.getWithBackoff({
            url: `https://registry.npmjs.org/${moduleName}`,
            json: true
        }).then((body) => {
            // #8 TODO it's probably better to read your package.json first and only default to latest
            if ((!body["dist-tags"] || !body["dist-tags"]["latest"]) &&
                !moduleVersion) {
                throw new Error("Invalid registry response");
            }
            var latestVer = body["dist-tags"]["latest"];
            if (moduleVersion && semver.valid(moduleVersion) != null) {
                const verMatch = semver.maxSatisfying(Object.keys(body["versions"]), moduleVersion);
                if (verMatch) {
                    latestVer = verMatch;
                }
            }
            if (!body["versions"] || !body["versions"][latestVer]) {
                throw new Error("Missing registry response data");
            }
            if (!body["versions"][latestVer]["repository"] || !body["versions"][latestVer]["repository"]["url"]) {
                throw new Error("Missing registry repository data");
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
                throw new Error("Unsupported registry repository type");
            }
            return this.queryGithub(githubParts.join("/"));
        });
    }
    queryGithub(url) {
        return this.getWithBackoff({
            url: url,
            headers: {
                "User-Agent": "bengreenier/vscode-node-readme",
                "Accept": "application/vnd.github.v3.raw"
            }
        });
    }
    getWithBackoff(opts) {
        return new Promise((resolve, reject) => {
            let call = backoff.call(extension_1.TestHook.getHttpImpl(), opts, (err, res) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res.body);
                }
            });
            call.retryIf(function (err) { return err.status !== 200; });
            call.setStrategy(new backoff.ExponentialStrategy());
            call.failAfter(5);
            call.start();
        });
    }
}
NpmProvider.SchemaType = "node-readme-npm-data";
exports.NpmProvider = NpmProvider;
//# sourceMappingURL=npm.js.map