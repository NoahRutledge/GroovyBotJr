import Discord from 'discord.js';
import { Logger } from '../groovy';
const fs = require('fs/promises');

const FILE_PATH = "./CreateCommand/Commands.json";
export const USER_MADE_COMMANDS = ["makecommand", "editcommand", "removecommand"];

let CachedCommands = new Map<string, string>();

export async function HandleUserMadeCommand(command: string, args: string[], message: Discord.Message)
{
    switch (command)
    {
        case "makecommand":
        case "editcommand":
            if ((args.length === 1 && message.attachments.size < 1) || (message.attachments.size === 0 && args.length < 2))
            {
                message.channel.send(`Invalid number of arguments: ${command} [command name] [action or attachment]`);
            }
            else
            {
                const commandName = args[0].toLowerCase();
                let commandAction;
                if (message.attachments.size !== 0)
                    commandAction = message.attachments.at(0).url;
                else
                    commandAction = message.content.substring(command.length + args[0].length + 3);

                let result;
                if (command === "makecommand")
                    result = await CreateCommand(commandName, commandAction);
                else
                    result = await EditCommand(commandName, commandAction);

                message.channel.send(result);
            }
            break;
        case "removecommand":
            if (args.length < 1)
                message.channel.send('Please specifiy the command to remove!');
            else
            {
                const commandName = args[0].toLowerCase();
                const result = await RemoveCommand(commandName);
                message.channel.send(result);
            }
            break;
        default:
            // Default assumes command exists as user made command because it's passed previous checks
            message.channel.send(CachedCommands.get(command));
            break;
    }
}

async function RemoveCommand(commandName: string)
{
    let fileData;
    try
    {
        fileData = await ReadCommandFile();
        fileData = JSON.parse(fileData);
    }
    catch (error)
    {
        if (error.code === 'ENOENT')
            return "No existing commands to remove!";
        else
        {
            Logger.LogError(error, "Error when trying to read commands file");
            return "An error has occured!  Failed to remove command";
        }
    }

    const commandIndex = fileData.commands.findIndex((val) => val.Name === commandName);
    if (commandIndex === -1)
        return "Command doesn't exist!";

    fileData.commands.splice(commandIndex, 1);

    try {
        await fs.writeFile(FILE_PATH, JSON.stringify(fileData));
        CachedCommands.delete(commandName);
    }
    catch (error) {
        Logger.LogError(error, "Error when trying to write to commands file");
        return "An error has occured! Failed to remove command.";
    }
    return "Successfully removed command!";
}

async function EditCommand(commandName: string, newCommandAction: string): Promise<string>
{
    let fileData;
    try
    {
        fileData = await ReadCommandFile();
        fileData = JSON.parse(fileData);
    }
    catch (error)
    {
        if (error.code === 'ENOENT')
            return "No existing commands to edit!";
        else
        {
            Logger.LogError(error, "Error when trying to read commands file");
            return "An error has occured!  Failed to edit command";
        }
    }

    const commandIndex = fileData.commands.findIndex((val) => val.Name === commandName);
    if (commandIndex === -1)
        return "Command doesn't exist!";
    fileData.commands[commandIndex].Action = newCommandAction;

    try
    {
        await fs.writeFile(FILE_PATH, JSON.stringify(fileData));
        CachedCommands.set(commandName, newCommandAction);
    }
    catch (error)
    {
        Logger.LogError(error, "Error when trying to write to commands file");
        return "An error has occured! Failed to edit command.";
    }
    return "Successfully updated command!";
}

async function CreateCommand(commandName: string, commandAction: string, ) : Promise<string>
{
    let dataToWrite;
    try
    {
        let fileData = await ReadCommandFile();

        dataToWrite = JSON.parse(fileData);
        
        if (dataToWrite.commands.filter((val) => { return val.Name === commandName; }).length > 0)
            return "Command already exists!";
    }
    catch (error)
    {
        if (error.code !== 'ENOENT')
        {
            Logger.LogError(error, "Error when trying to read commands file");
            return "An error has occured! Failed to create command.";
        }
    }

    try
    {
        let response = await WriteNewCommand(commandName, commandAction, dataToWrite);
        CachedCommands.set(commandName, commandAction);
        return response;
    }
    catch (error)
    {
        Logger.LogError(error, "Error when trying to write to commands file");
        return "An error has occured! Failed to create command.";
    }
}

async function ReadCommandFile(): Promise<string>
{
    let fileData;
    await fs.readFile(FILE_PATH)
        .then(function (data) { fileData = data; })
        .catch(function (error) { throw error; });
    return fileData;
}

async function WriteNewCommand(commandName : string, commandAction : string, fileData? : any) : Promise<string>
{
    let commandList = fileData ? fileData : { commands: [] };
    commandList.commands.push({
        "Name": commandName,
        "Action": commandAction
    });

    const json = JSON.stringify(commandList);
    await fs.writeFile(FILE_PATH, json)
        .catch(function (error) { throw error; });

    return "Command successfully made!";
}

export async function PrefetchUserMadeCommands()
{
    let fileData;
    try {
        fileData = await ReadCommandFile();
        fileData = JSON.parse(fileData);
    }
    catch (error) {
        if (error.code === 'ENOENT') // Nothing to cache
            return;
        else {
            Logger.LogError(error, "Error when trying to read commands file");
            return;
        }
    }

    fileData.commands.forEach((val) => { CachedCommands.set(val.Name, val.Action); });
}

export function IsUserMadeCommand(commandName: string) : boolean
{
    return CachedCommands.has(commandName);
}