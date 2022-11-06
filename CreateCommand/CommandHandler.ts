const fs = require('fs/promises');

const FILE_PATH = "./CreateCommand/Commands.json";

export async function CreateCommand(commandName: string, commandAction: string, ) : Promise<string>
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