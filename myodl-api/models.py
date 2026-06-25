from pydantic import BaseModel

class Session(BaseModel):
    discord_id: int

class Level(BaseModel):
    level_id: int
    name: str
    position: int
    aredl_url: str | None = None
    thumbnail_url: str | None = None
    description: str | None = None

class List(BaseModel):
    list_id: int
    owner_discord_id: str
    name: str
    description: str | None = None
    community_url: str | None = None
    icon_url: str | None = None
    public: bool

class User(BaseModel):
    discord_id: str
    username: str
    avatar_url: str | None = None
    description: str | None = None

class UserResponse(BaseModel):
    total: int
    limit: int
    offset: int
    users: list[User]

class UserLevelEntry(BaseModel):
    level: Level
    video_url: str | None = None
    record: int = 100

class UserLevels(BaseModel):
    user: User
    levels: list[UserLevelEntry]

class UserRecord(BaseModel):
    level: Level
    record: int

class UserRecords(BaseModel):
    user: User
    records: list[UserRecord]

class UserLists(BaseModel):
    user: User
    lists: list[List]

class UserAdmin(BaseModel):
    user: User
    admin: bool
    owner: bool

class UserAdmins(BaseModel):
    count: int
    admins: list[UserAdmin]

class UserDetails(BaseModel):
    user: User
    levels: list[UserLevelEntry] | None = None
    records: list[UserRecord] | None = None
    lists: list[List] | None = None
    admin: bool
    owner: bool

class ListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    lists: list[List]

class ListLevels(BaseModel):
    list: List
    levels: list[Level]

class ListMember(BaseModel):
    user: User
    role: str
    joined_at: str

class ListRecord(BaseModel):
    level: Level
    record: int

class ListRecords(BaseModel):
    list: List
    user: User
    records: list[ListRecord]

class UpdateDescription(BaseModel):
    description: str | None = None

class AddUserLevel(BaseModel):
    level_id: int
    video_url: str | None = None
    record: int = 100

class UpdateUserLevel(BaseModel):
    video_url: str | None = None
    record: int = 100