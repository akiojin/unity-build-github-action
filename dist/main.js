"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const os = __importStar(require("os"));
const unity_command_1 = require("@akiojin/unity-command");
async function Run() {
    try {
        const projectDirectory = core.getInput('project-directory');
        const unityVersion = await unity_command_1.Unity.GetVersion(projectDirectory);
        const builder = new unity_command_1.UnityCommandBuilder();
        builder.SetBuildTarget(core.getInput('build-target'));
        builder.SetProjectPath(projectDirectory);
        builder.SetOutputPath(core.getInput('output-directory'));
        builder.SetLogFile(core.getInput('log-file'));
        if (core.getInput('execute-method') !== '') {
            builder.SetExecuteMethod(core.getInput('execute-method'));
        }
        if (core.getInput('additional-arguments') !== '') {
            builder.AddCommand(core.getInput('additional-arguments').split(' '));
        }
        await exec.exec(unity_command_1.Unity.GetExecutePath(os.platform(), unityVersion), builder.Build());
    }
    catch (ex) {
        core.setFailed(ex.message);
    }
}
Run();
