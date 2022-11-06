import Discord from 'discord.js';
const fs = require('fs/promises');

const FILE_PATH = "./CreateCommand/Commands.json";
export const USER_MADE_COMMANDS = ["makecommand", "editcommand", "removecommand"];

export async function HandleUserMadeCommand(command: string, args: string[], message: Discord.Message)
{
    switch (command)
    {
        case "makecommand":
            if (args.length < 3)
                message.channel.send("Not enough arguments: createcommand [command name] [action]");
            else
            {
                const newCommandName = args[1];
                const newCommandAction = message.content.substring(command.length + args[1].length + 3);
                StartCreateCommand(message, newCommandName, newCommandAction);
            }
            break;
        case "editcommand":
            break;
        case "removecommand":
            break;
    }
}

async function StartCreateCommand(message : Discord.Message, newCommandName : string, newCommandAction : string)
{
    const result = await CreateCommand(newCommandName, newCommandAction);
    message.channel.send(result);
}

async function CreateCommand(commandName: string, commandAction: string, ) : Promise<string>
{
    let dataToWrite = null;
    let response;

    await fs.readFile(FILE_PATH)
        .then(function (data)
        {
            const commandData = JSON.parse(data);

            if (commandData.commands.filter((val) => { return val.Name === commandName; }).length > 0)
                response = "Command already exists!";

            dataToWrite = commandData;
        })
        .catch(function (error) { if (error.code !== 'ENOENT') throw error;});

    if (response)
        return response;

    await WriteNewCommand(commandName, commandAction, dataToWrite)
        .then(function (functionResult)
        {
            response = functionResult;
        });

    return response;
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
        .catch(function (err) { throw err; });

    return "Command successfully made!";
}