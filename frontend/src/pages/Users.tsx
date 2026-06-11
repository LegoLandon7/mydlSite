import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import UsersList from '../components/UsersList';
import '../components/UsersList.scss';

const API_URL = "api.myodl.net";

type User = {
    discord_id: string;
    username: string;
    avatar_url: string | null;
};

type UsersResponse = {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    users: User[];
};

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = useParams();

    useEffect(() => { fetchUsers(1); }, []);

    useEffect(() => {
        if (id && users.length > 0)
            setSelectedUser(users.find(u => u.discord_id === id) || null);
    }, [id, users]);

    const fetchUsers = async (page: number) => {
        try {
            const res = await fetch(`${API_URL}/users/?page=${page}`);
            if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
            const data: UsersResponse = await res.json();
            setUsers(data.users);
            setTotalPages(data.total_pages);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    return (
        <UsersList
            users={users}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            totalPages={totalPages}
            onPageChange={fetchUsers}
            loading={loading}
            error={error}
            onRetry={() => fetchUsers(1)}
        />
    );
}