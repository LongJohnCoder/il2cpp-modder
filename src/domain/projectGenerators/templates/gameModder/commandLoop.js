const _ = require("lodash");
const { pathMemoryHackHooks, hookDataThis, hookDataPath } = require("./mods/hookUtils");
    // ()((*hookedData).player + physicsOffset)
    `

    uintptr_t player = (*hookedData).player;
    uintptr_t FFGALNAPKCD_GetTruePosition_this = (*hookedData).FFGALNAPKCD_GetTruePosition_this;
    
    uintptr_t* physics = (uintptr_t*)(player + 0x5c);
    uintptr_t* MyPhysics = (uintptr_t*)(FFGALNAPKCD_GetTruePosition_this + 0x5C);
    
    float* speed = (float*)(*physics + 0x24);
    float* Speed = (float*)(MyPhysics + 0x24);
    
    (*hookedData).player_myphisics_speed = speed;
    
    (*hookedData).FFGALNAPKCD_MyPhysics_Speed = Speed;  



    printf("[] Player located at: %x\\n", player);
    printf("[] Player Physics located at: %x\\n", physics);
    printf("[*] Speed located at: %x \\n", speed);

    bool* moveable = (bool*)(player + 0x30);
    printf("[*] moveable located at: %x \\n", moveable);
    
    playerAddresses.moveable = moveable;`

const _variableName = sentence => sentence.split("=")[0].split(" ")[1].trim()
const _traversePath = (hook, path) => {
    const { fields } = path;
    const fieldType = `${_.last(fields).type}*`; //TODO EXTRACT LOGIC MODELSHEADER.JS
    const fieldName = hookDataPath(hook, fields); //TODO EXTRACT LOGIC MODELSHEADER.JS
    const indirectionSentences = [`uintptr_t ${hookDataThis(hook)} = (*hookedData).${hookDataThis(hook)};`]
    fields.forEach(({ field, offset, type }, i) => {
        const pointerType = i == fields.length - 1? type : "uintptr_t";
        const indirectionSentence = `${pointerType}* ${field} = (${pointerType}*)(${i?"*":""}${_variableName(indirectionSentences[i])} + ${offset});`;
        indirectionSentences.push(indirectionSentence);
    })
    return `
     ${indirectionSentences.join("\n\t")}
    (*hookedData).${fieldName} = ${_variableName(_.last(indirectionSentences))};`;
}

module.exports = (rules, metadata) => {
    const hooks = pathMemoryHackHooks(metadata);
    const populateHookedPaths = _(hooks).flatMap(hook => hook.paths.map(path =>_traversePath(hook, path))).value();
    
    return `#include "pch.h"
#include "models.h"
#include "hooking.h"
#include "utils.h"
#include <iostream>
using namespace std;

void populateHookedPaths(HookedData* hookedData) 
{
    ${populateHookedPaths.join("\t\n")}
}
void commandLoop(HookedData* hookedData)
{
    printf("[] Assembly located at: %x\\n", (*hookedData).assembly);
    while (!(*hookedData).player) { printf("hookedData %x - Player control not found yet\\n", hookedData); Sleep(1000); }
    
    int command = 0;
    while (true)
    {
        command = 0;
        printf("Available commands:\\n  1 - change speed\\n\\n  2 - toggle freeze\\n\\n");
        printf("Enter a command: ");
        cin >> command;
        populateHookedPaths(hookedData);
        HookedData populatedData = *hookedData;
        if (command != 0)
        {
            switch (command)
            {
            case 1: // Change speed
            {
                printf("Your current speed is: %f\\n", *(float*)populatedData.speed);
                int new_speed = 0;
                printf("Enter new speed: ");
                scanf_s("%d", &new_speed);
                // We know from dnSpy that this variable is a float. Make it so.
                *(float*)populatedData.speed = (float)new_speed;
                break;
            }
            case 2: // Toggle freeze
            {
                bool isMoveable = *populatedData.moveable;
                auto from = isMoveable ? "moving" : "freezed";
                auto to = !isMoveable ? "moving" : "freezed";
                printf("Changing from ");
                printf(from);
                printf(" to ");
                printf(to);
                printf("\\n");
                *(bool*)populatedData.moveable = !(*populatedData.moveable);
                break;
            }
            default:
                printf("Invalid command\\n");
                break;
            }
        }
    }

}

void insertConsole()
{
    AllocConsole();
    FILE* f = new FILE();
    freopen_s(&f, "CONOUT$", "w", stdout);
    freopen_s(&f, "CONIN$", "r", stdin);
    printf("[*] Injected...\\n");
    uintptr_t* player = nullptr;
    HookedData hookedData = HookedData();
    printf("[*] hookedData... %x\\n", &hookedData);

    hookData(&hookedData);
    commandLoop(&hookedData);
}
`
}
