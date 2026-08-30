local labelsList = {}
local isUIOpen = false
local previewData = nil

-- Helper to retrieve nearby active labels
function GetNearbyLabels(maxDist)
    local list = {}
    local playerCoords = GetEntityCoords(PlayerPedId())
    for _, label in ipairs(labelsList) do
        local dist = #(playerCoords - vector3(label.x, label.y, label.z))
        if dist <= maxDist then
            local labelCopy = {}
            for k, v in pairs(label) do
                labelCopy[k] = v
            end
            labelCopy.distance = dist -- update distance for UI context
            table.insert(list, labelCopy)
        end
    end
    return list
end

-- Render loop function
function DrawText3D(x, y, z, text, zOffset, scale, r, g, b, a, font, shadow, outline)
    local onScreen, _x, _y = GetScreenCoordFromWorldCoord(x, y, z + (zOffset or 0.0))
    if onScreen then
        SetTextScale(scale or Config.TextScale, scale or Config.TextScale)
        SetTextFontForCurrentCommand(font or Config.TextFont)
        SetTextColor(r or Config.TextColor.r, g or Config.TextColor.g, b or Config.TextColor.b, a or Config.TextColor.a)
        SetTextCentre(true)
        
        -- Shadow rendering
        if shadow == nil or shadow == 1 or shadow == true then
            SetTextDropshadow(1, 0, 0, 0, 255)
        end
        
        -- Outline rendering
        if outline == 1 or outline == true then
            SetTextOutline()
        end
        
        local str = CreateVarString(10, 'LITERAL_STRING', text)
        DisplayText(str, _x, _y)
    end
end

-- Optimized thread for rendering 3D labels and preview text
CreateThread(function()
    while true do
        local sleep = 1000
        local playerPed = PlayerPedId()
        local playerCoords = GetEntityCoords(playerPed)
        local nearby = false

        -- Render active world labels
        if #labelsList > 0 then
            for _, label in ipairs(labelsList) do
                local dist = #(playerCoords - vector3(label.x, label.y, label.z))
                -- Use the database-defined visibility distance parameter
                if dist <= (label.distance or Config.DefaultDistance) then
                    nearby = true
                    DrawText3D(
                        label.x, label.y, label.z,
                        label.text, label.z_offset, label.scale,
                        label.color_r, label.color_g, label.color_b, label.color_a,
                        label.font, label.shadow, label.outline
                    )
                end
            end
        end

        -- Render live 3D preview text for the label being designed
        if isUIOpen and previewData then
            nearby = true
            DrawText3D(
                playerCoords.x, playerCoords.y, playerCoords.z,
                previewData.text, previewData.z_offset, previewData.scale,
                previewData.color.r, previewData.color.g, previewData.color.b, previewData.color.a,
                previewData.font, previewData.shadow, previewData.outline
            )
        end

        if nearby then
            sleep = 0
        else
            if isUIOpen then
                sleep = 0 -- stay active to draw dynamic preview changes
            else
                sleep = 500
            end
        end
        Wait(sleep)
    end
end)

-- Receive synchronized list of labels from server
RegisterNetEvent('coi_label:syncLabels', function(labels)
    labelsList = labels
    if isUIOpen then
        SendNUIMessage({
            action = "updateLabels",
            labels = GetNearbyLabels(100.0)
        })
    end
end)

-- Ask server for initial list when client loads
CreateThread(function()
    TriggerServerEvent('coi_label:requestSync')
end)

-- Event to open admin control panel dashboard
RegisterNetEvent('coi_label:openMenu', function()
    isUIOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = "open",
        labels = GetNearbyLabels(100.0)
    })
end)

-- NUI Callbacks
RegisterNUICallback('coi_label:closeUI', function(data, cb)
    isUIOpen = false
    previewData = nil
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('coi_label:updatePreview', function(data, cb)
    previewData = data
    cb('ok')
end)

RegisterNUICallback('coi_label:saveLabel', function(data, cb)
    isUIOpen = false
    previewData = nil
    SetNuiFocus(false, false)
    TriggerServerEvent('coi_label:createLabel', data)
    cb('ok')
end)

RegisterNUICallback('coi_label:deleteLabel', function(data, cb)
    TriggerServerEvent('coi_label:deleteLabel', data.id)
    cb('ok')
    Wait(200)
    SendNUIMessage({
        action = "updateLabels",
        labels = GetNearbyLabels(100.0)
    })
end)

RegisterNUICallback('coi_label:deleteAll', function(data, cb)
    TriggerServerEvent('coi_label:deleteAllLabels')
    cb('ok')
    Wait(200)
    SendNUIMessage({
        action = "updateLabels",
        labels = {}
    })
end)

RegisterNUICallback('coi_label:teleportTo', function(data, cb)
    for _, label in ipairs(labelsList) do
        if label.id == data.id then
            local ped = PlayerPedId()
            SetEntityCoords(ped, label.x, label.y, label.z + 1.0, false, false, false, true)
            TriggerEvent("vorp:TipRight", "Teleported to label location", 3000)
            break
        end
    end
    cb('ok')
end)

