import Discord from 'discord.js';
import { Logger } from '../groovy';
const fs = require('fs/promises');

const FILE_PATH = "./CreateCommand/Commands.json";
export const USER_MADE_COMMANDS = ["makecommand", "editcommand", "removecommand"];

export async function HandleUserMadeCommand(command: string, args: string[], message: Discord.Message)
{
    switch (command)
    {
        case "makecommand":
        case "editcommand":
            if (args.length < 3)
                message.channel.send(`Not enough arguments: ${command} [command name] [action]`);
            else
            {
                const commandName = args[1];
                const commandAction = message.content.substring(command.length + args[1].length + 3);
                let result;
                if (command === "makecommand")
                    result = await CreateCommand(commandName, commandAction);
                else
                    result = await EditCommand(commandName, commandAction);

                message.channel.send(result);
            }
            break;
        case "removecommand":
            break;
    }
}

async function EditCommand(commandName: string, newCommandAction: string): Promise<string>
{
    let fileData;
    try
    {
        fileData = await ReadCommandFile();
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

    fileData = JSON.parse(fileData);
    fileData.commands.forEach((val) => { if(val.Name === commandName) val.Action = newCommandAction; });

    try
    {
        await fs.writeFile(FILE_PATH, JSON.stringify(fileData));
    }
    catch (error)
    {
        Logger.LogError(error, "Error when trying to write to commands file");
        return "An error has occured! Failed to create command.";
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
    console.log(dataToWrite);
    try
    {
        return await WriteNewCommand(commandName, commandAction, dataToWrite);
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