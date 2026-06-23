export type List = {
    list_id: number;
    owner_discord_id: string;
    name: string;
    description?: string;
    community_url?: string;
    icon_url?: string;
    public: boolean;
}

// class List(BaseModel):
//     list_id: int
//     owner_discord_id: str
//     name: str
//     description: str | None = None
//     community_url: str | None = None
//     icon_url: str | None = None
//     public: bool