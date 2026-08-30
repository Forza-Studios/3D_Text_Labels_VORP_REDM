Config = {}

-- Groups allowed to use /label command and access the admin menu.
Config.AdminGroups = {
    'admin',
    'moderator',
    'superadmin'
}

-- Default values for label creation
Config.DefaultDistance = 15.0  -- Default visibility distance in meters
Config.MaxDistance = 100.0     -- Maximum visibility distance allowed to be set

-- Menu alignment (used by vorp_menu)
Config.AlignMenu = 'top-left'

-- Text rendering configuration
Config.TextScale = 0.35        -- Default font scale
Config.TextFont = 1            -- Default font ID (1 is standard sans-serif in RedM)
Config.TextColor = {r = 255, g = 255, b = 255, a = 220} -- Default color if no format code is used

-- UI Language strings
Config.Language = {
    noPermission = "You do not have permission to use this command.",
    menuTitle = "3D World Labels",
    menuSubTitle = "Admin Tool",
    createLabel = "Create Label Here",
    deleteNearby = "Delete Nearby Labels",
    deleteAll = "Delete All Labels (Caution)",
    enterText = "Enter Label Text (Color codes like ~r~, ~g~ supported)",
    enterDistance = "Enter Visibility Distance (meters)",
    labelCreated = "Label created successfully!",
    labelDeleted = "Label deleted successfully!",
    allDeleted = "All world labels have been deleted.",
    invalidText = "Invalid text entered.",
    invalidDistance = "Invalid distance. Defaulting to 15m.",
    noNearby = "No labels found within 15 meters.",
    confirmDeleteAll = "Are you sure you want to delete ALL labels?",
    yes = "Yes, delete everything",
    no = "No, cancel",
    back = "Back"
}
