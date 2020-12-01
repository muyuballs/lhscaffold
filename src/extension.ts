// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as jszip from 'jszip';
/**
images/0.75x/my_icon.png (ldpi inside 0.75x folder)
images/my_icon.png (mdpi directly inside images)
images/1.5x/my_icon.png (hdpi inside 1.5x folder)
images/2.0x/my_icon.png (xhdpi inside 2.0x folder)
images/3.0x/my_icon.png (xxhdpi inside 3.0x folder)
images/4.0x/my_icon.png (xxxhdpi inside 4.0x folder)
 */

let _dirMap: Map<string, string> = new Map([
	["ldpi", "0.75x"],
	["mdpi", ""],
	["hdpi", "1.5x"],
	["xhdpi", "2.0x"],
	["xxhdpi", "3.0x"],
	["xxxhdpi", "4.0x"],
	["xxxxhdpi", "5.0x"],
]);

function fname(file: string): string | undefined {
	if (!file) {
		return
	}
	let fragments = file.split("/");
	return fragments[fragments.length - 1].split(".")[0];
}

function dname(path: string): string | undefined {
	if (!path) {
		return
	}
	if (path[0] == '/') {
		path = path.substring(1);
	}
	let rawDir = path.split("/")[0].replace('mipmap-', '').replace('drawable-', '');
	return _dirMap.get(rawDir);
}

function unzip(file: vscode.Uri, dest: vscode.Uri, name: string) {
	vscode.workspace.fs.readFile(file).then(data => {
		jszip.loadAsync(data).then(zip => {
			zip.forEach((path, data) => {
				if (!data.dir) {
					let ext = data.name.substring(data.name.lastIndexOf("."));
					let dir = dname(path);
					if (dir != undefined) {
						let fullUri = vscode.Uri.joinPath(dest, dir, name + ext);
						console.log(`${data.name} -> ${fullUri.fsPath}`);
						data.async("uint8array").then(dat => {
							vscode.workspace.fs.writeFile(fullUri, dat).then(() => { }, (e) => {
								vscode.window.showErrorMessage(`import ${fullUri.path} err:${e}`);
							});
						}).catch(e => {
							vscode.window.showErrorMessage(`import ${fullUri.path} err:${e}`);
						});
					} else {
						console.log(`${data.name} ignore(no match target dir)`);
					}
				}
			});
			vscode.window.showInformationMessage('import job done.');
		}).catch(e => {
			vscode.window.showErrorMessage(`import image failed:${e}`);
		});
	})
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "lhscaffold" is now active!');

	let importCmd = vscode.commands.registerCommand('lhscaffold.import-images', () => {
		if (!vscode.workspace.workspaceFolders) {
			return;
		}
		let imageRoot = vscode.workspace.getConfiguration('', vscode.workspace.workspaceFolders[0]).get<string>("lhscaffold.default-dir") || 'assets/images';
		let root = vscode.workspace.workspaceFolders[0].uri;
		let dest = vscode.Uri.joinPath(root, imageRoot);
		console.log(`dest dir:${dest.fsPath}`);
		vscode.workspace.fs.createDirectory(dest).then(() => {
			console.log("make dest folder success");
			vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'zip': ['zip'] } }).then(uri => {
				if (uri?.length) {
					let file = uri[0];
					console.log(`picked file:${file.fsPath}`);
					vscode.window.showInputBox({ prompt: "File Name", value: fname(file.path) }).then((name) => {
						if (!name) {
							vscode.window.showWarningMessage("import canceled");
							return;
						}
						console.log(`the new name is:${name}`);
						vscode.workspace.fs.readDirectory(dest).then(entity => {
							entity.forEach((x) => console.log('entry in image root:', x[0], x[1]));
							let fns = entity.map(x => x[1] == vscode.FileType.File ? x[0].split(".", 2)[0] : undefined).filter(x => x != undefined);
							if (fns.indexOf(name) > -1) {
								vscode.window.showQuickPick(["No", "Yes"], { canPickMany: false, placeHolder: 'filename already exists,continue import(same extension will override)?' }).then(x => {
									if ('Yes' == x) {
										unzip(file, dest, name);
									} else {
										vscode.window.showWarningMessage("import canceled");
									}
								})
							} else {
								unzip(file, dest, name);
							}
						}, (e) => {
							vscode.window.showErrorMessage(`open zip file failed:${e}`);
						});
					});
				}
			});
		}, (e) => {
			vscode.window.showWarningMessage(`make image root dir err:${e}`);
		});
	});
	context.subscriptions.push(importCmd);
}

// this method is called when your extension is deactivated
export function deactivate() { }
