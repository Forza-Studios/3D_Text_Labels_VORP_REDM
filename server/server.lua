local VORPcore = exports.vorp_core:GetCore()
local worldLabels = {}

-- Auto-initialize database table on resource start with columns
CreateThread(function()
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `coi_labels` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `text` VARCHAR(255) NOT NULL,
            `x` FLOAT NOT NULL,
            `y` FLOAT NOT NULL,
            `z` FLOAT NOT NULL,
            `z_offset` FLOAT NOT NULL DEFAULT 0.0,
            `color_r` INT NOT NULL DEFAULT 255,
            `color_g` INT NOT NULL DEFAULT 255,
            `color_b` INT NOT NULL DEFAULT 255,
            `color_a` INT NOT NULL DEFAULT 220,
            `scale` FLOAT NOT NULL DEFAULT 0.35,
            `font` INT NOT NULL DEFAULT 1,
            `shadow` TINYINT NOT NULL DEFAULT 1,
            `outline` TINYINT NOT NULL DEFAULT 0,
            `distance` FLOAT NOT NULL DEFAULT 15.0,
            `created_by` VARCHAR(100) DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]], {}, function()
        -- Auto migration check for columns in existing table installations
        local columns = {
            { name = "z_offset", type = "FLOAT NOT NULL DEFAULT 0.0" },
            { name = "color_r", type = "INT NOT NULL DEFAULT 255" },
            { name = "color_g", type = "INT NOT NULL DEFAULT 255" },
            { name = "color_b", type = "INT NOT NULL DEFAULT 255" },
            { name = "color_a", type = "INT NOT NULL DEFAULT 220" },
            { name = "scale", type = "FLOAT NOT NULL DEFAULT 0.35" },
            { name = "font", type = "INT NOT NULL DEFAULT 1" },
            { name = "shadow", type = "TINYINT NOT NULL DEFAULT 1" },
            { name = "outline", type = "TINYINT NOT NULL DEFAULT 0" }
        }

        local function checkMigrate(index)
            if index > #columns then
                LoadLabelsFromDatabase()
                return
            end
            local col = columns[index]
            MySQL.query("SHOW COLUMNS FROM `coi_labels` LIKE ?", { col.name }, function(res)
                if not res or #res == 0 then
                    local alterQuery = string.format("ALTER TABLE `coi_labels` ADD COLUMN `%s` %s", col.name, col.type)
                    MySQL.query(alterQuery, {}, function()
                        print(("[coi_label] Migrated DB column: %s"):format(col.name))
                        checkMigrate(index + 1)
                    end)
                else
                    checkMigrate(index + 1)
                end
            end)
        end
        checkMigrate(1)
    end)
end)

-- Fetch labels from DB and store in memory cache
function LoadLabelsFromDatabase()
    MySQL.query('SELECT * FROM coi_labels', {}, function(results)
        worldLabels = {}
        if results then
            for _, row in ipairs(results) do
                table.insert(worldLabels, {
                    id = row.id,
                    text = row.text,
                    x = row.x,
                    y = row.y,
                    z = row.z,
                    z_offset = tonumber(row.z_offset) or 0.0,
                    color_r = tonumber(row.color_r) or 255,
                    color_g = tonumber(row.color_g) or 255,
                    color_b = tonumber(row.color_b) or 255,
                    color_a = tonumber(row.color_a) or 220,
                    scale = tonumber(row.scale) or 0.35,
                    font = tonumber(row.font) or 1,
                    shadow = tonumber(row.shadow) or 1,
                    outline = tonumber(row.outline) or 0,
                    distance = tonumber(row.distance) or Config.DefaultDistance,
                    created_by = row.created_by or "Unknown"
                })
            end
        end
        print(('[coi_label] Loaded %d world labels from database.'):format(#worldLabels))
        -- Broadcast cache to all connected clients
        TriggerClientEvent('coi_label:syncLabels', -1, worldLabels)
    end)
end

-- Sync events for connecting/character-selected players
RegisterNetEvent('coi_label:requestSync', function()
    local _source = source
    TriggerClientEvent('coi_label:syncLabels', _source, worldLabels)
end)

RegisterNetEvent('vorp:SelectedCharacter', function(source, character)
    TriggerClientEvent('coi_label:syncLabels', source, worldLabels)
end)

-- Register the /label command (admin only)
RegisterCommand('label', function(source, args, rawCommand)
    local _source = source
    if _source == 0 then
        print("[coi_label] This command must be run in-game.")
        return
    end

    local User = VORPcore.getUser(_source)
    if not User then return end

    local group = User.getGroup
    local isAllowed = false

    for _, allowedGroup in ipairs(Config.AdminGroups) do
        if group == allowedGroup then
            isAllowed = true
            break
        end
    end

    if isAllowed then
        TriggerClientEvent('coi_label:openMenu', _source)
    else
        VORPcore.NotifyRightTip(_source, Config.Language.noPermission, 4000)
    end
end, false)

-- Server Event: Create Label with full style customization properties
RegisterNetEvent('coi_label:createLabel', function(data)
    local _source = source
    local User = VORPcore.getUser(_source)
    if not User then return end

    -- Server-side permission check for security
    local group = User.getGroup
    local isAllowed = false
    for _, allowedGroup in ipairs(Config.AdminGroups) do
        if group == allowedGroup then
            isAllowed = true
            break
        end
    end

    if not isAllowed then
        VORPcore.NotifyRightTip(_source, Config.Language.noPermission, 4000)
        return
    end

    local ped = GetPlayerPed(_source)
    local coords = GetEntityCoords(ped)

    local Character = User.getUsedCharacter
    local adminName = Character and (Character.firstname .. ' ' .. Character.lastname) or "Admin"

    -- Ensure sanitization and defaults
    local labelText = data.text or "Admin Announcement"
    local zOffset = tonumber(data.z_offset) or 0.0
    local scale = tonumber(data.scale) or 0.35
    local distance = tonumber(data.distance) or Config.DefaultDistance
    local colorR = tonumber(data.color_r) or 255
    local colorG = tonumber(data.color_g) or 255
    local colorB = tonumber(data.color_b) or 255
    local colorA = tonumber(data.color_a) or 220
    local font = tonumber(data.font) or 1
    local shadow = tonumber(data.shadow) or 1
    local outline = tonumber(data.outline) or 0

    MySQL.query([[
        INSERT INTO coi_labels 
        (text, x, y, z, z_offset, color_r, color_g, color_b, color_a, scale, font, shadow, outline, distance, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ]],
    { 
        labelText, coords.x, coords.y, coords.z, zOffset, 
        colorR, colorG, colorB, colorA, scale, font, shadow, outline, 
        distance, adminName 
    }, function(result)
        if result then
            local insertId = result.insertId
            local labelObj = {
                id = insertId or math.random(100000),
                text = labelText,
                x = coords.x,
                y = coords.y,
                z = coords.z,
                z_offset = zOffset,
                color_r = colorR,
                color_g = colorG,
                color_b = colorB,
                color_a = colorA,
                scale = scale,
                font = font,
                shadow = shadow,
                outline = outline,
                distance = distance,
                created_by = adminName
            }
            
            if not insertId then
                MySQL.query('SELECT LAST_INSERT_ID() as id', {}, function(subResult)
                    if subResult and subResult[1] and subResult[1].id then
                        labelObj.id = subResult[1].id
                    end
                    table.insert(worldLabels, labelObj)
                    TriggerClientEvent('coi_label:syncLabels', -1, worldLabels)
                end)
            else
                table.insert(worldLabels, labelObj)
                TriggerClientEvent('coi_label:syncLabels', -1, worldLabels)
            end
            VORPcore.NotifyRightTip(_source, Config.Language.labelCreated, 4000)
        end
    end)
end)

-- Server Event: Delete Label
RegisterNetEvent('coi_label:deleteLabel', function(labelId)
    local _source = source
    local User = VORPcore.getUser(_source)
    if not User then return end

    -- Server-side permission check
    local group = User.getGroup
    local isAllowed = false
    for _, allowedGroup in ipairs(Config.AdminGroups) do
        if group == allowedGroup then
            isAllowed = true
            break
        end
    end

    if not isAllowed then
        VORPcore.NotifyRightTip(_source, Config.Language.noPermission, 4000)
        return
    end

    MySQL.query('DELETE FROM coi_labels WHERE id = ?', { labelId }, function(result)
        for i, label in ipairs(worldLabels) do
            if label.id == labelId then
                table.remove(worldLabels, i)
                break
            end
        end
        TriggerClientEvent('coi_label:syncLabels', -1, worldLabels)
        VORPcore.NotifyRightTip(_source, Config.Language.labelDeleted, 4000)
    end)
end)

-- Server Event: Delete All Labels
RegisterNetEvent('coi_label:deleteAllLabels', function()
    local _source = source
    local User = VORPcore.getUser(_source)
    if not User then return end

    -- Server-side permission check
    local group = User.getGroup
    local isAllowed = false
    for _, allowedGroup in ipairs(Config.AdminGroups) do
        if group == allowedGroup then
            isAllowed = true
            break
        end
    end

    if not isAllowed then
        VORPcore.NotifyRightTip(_source, Config.Language.noPermission, 4000)
        return
    end

    MySQL.query('TRUNCATE TABLE coi_labels', {}, function(result)
        worldLabels = {}
        TriggerClientEvent('coi_label:syncLabels', -1, worldLabels)
        VORPcore.NotifyRightTip(_source, Config.Language.allDeleted, 4000)
    end)
end)

