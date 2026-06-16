import { useState, useEffect } from "react";
import type { UserType } from '../util/types';
import UserMenu from '../components/UsersMenu';

<<<<<<< HEAD
const API_URL = import.meta.env.VITE_API_URL;
const API_ENDPOINT = `${API_URL}/users`
=======
const API_URL = "https://api.myodl.net";
>>>>>>> 12fe22b8d27dba735bf5824824440d4c4711188e

const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**        "page":        page,
        "per_page":    50,
        "total":       total,
        "total_pages": -(-total // 50),
        "users":       [dict(row) for row in rows] */

export default function Users() {
    return <UserMenu />;
}