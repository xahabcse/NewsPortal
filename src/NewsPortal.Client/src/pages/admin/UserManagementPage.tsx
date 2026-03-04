import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';
import { UserManagementService, type User, type CreateUserDto, type UpdateUserDto } from '../../services/UserManagementService';
import toast from 'react-hot-toast';

const UserManagementPage = () => {
    const { role, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
    const [formData, setFormData] = useState<CreateUserDto>({
        username: '',
        email: '',
        password: '',
        role: 'Viewer',
        isActive: true
    });
    const [newPassword, setNewPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const ROLES = ['SuperAdmin', 'Admin', 'Editor', 'Reader'];

    const isAdmin = role === 'Admin' || role === 'SuperAdmin';

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) {
            navigate('/');
            toast.error('Access denied. Admin role required.');
        }
    }, [isAuthenticated, isAdmin, navigate]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await UserManagementService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                password: '',
                role: user.role,
                isActive: user.isActive
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                role: 'Viewer',
                isActive: true
            });
        }
        setErrors({});
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            role: 'Viewer',
            isActive: true
        });
        setErrors({});
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!editingUser && !formData.password) {
            newErrors.password = 'Password is required';
        } else if (!editingUser && formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!formData.role) {
            newErrors.role = 'Role is required';
        }

        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            if (editingUser) {
                const updateData: UpdateUserDto = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    isActive: formData.isActive
                };
                await UserManagementService.update(editingUser.id, updateData);
                toast.success('User updated successfully');
            } else {
                await UserManagementService.create(formData as CreateUserDto);
                toast.success('User created successfully');
            }
            fetchUsers();
            closeModal();
        } catch (error: any) {
            console.error('Failed to save user:', error);
            toast.error(error.response?.data?.message || 'Failed to save user');
        }
    };

    const handleDelete = async (id: number, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await UserManagementService.delete(id);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error: any) {
            console.error('Failed to delete user:', error);
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const openPasswordModal = (userId: number) => {
        setPasswordUserId(userId);
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        try {
            if (passwordUserId) {
                await UserManagementService.resetPassword(passwordUserId, newPassword);
                toast.success('Password reset successfully');
                setShowPasswordModal(false);
                setPasswordUserId(null);
                setNewPassword('');
            }
        } catch (error: any) {
            console.error('Failed to reset password:', error);
            toast.error(error.response?.data?.message || 'Failed to reset password');
        }
    };

    const getRoleBadgeClass = (userRole: string) => {
        switch (userRole) {
            case 'SuperAdmin':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'Admin':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'Editor':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default:
                return 'bg-green-500/20 text-green-400 border-green-500/30';
        }
    };

    const superAdminCount = users.filter(u => u.role === 'SuperAdmin' && u.isActive).length;

    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    return (
        <>
            <SEO
                title="User Management"
                description="Manage system users, roles, and permissions."
            />
            <div className="p-8">
                <div>
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                                <p className="text-secondary text-sm">Manage users, roles, and account status</p>
                            </div>
                            <button
                                onClick={() => openModal()}
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/80 transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add User
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="glass-morphism border border-glass-border rounded-xl p-4">
                            <div className="text-sm text-secondary mb-1">Total Users</div>
                            <div className="text-2xl font-bold text-white">{users.length}</div>
                        </div>
                        <div className="glass-morphism border border-glass-border rounded-xl p-4">
                            <div className="text-sm text-secondary mb-1">Super Admins</div>
                            <div className="text-2xl font-bold text-purple-400">{superAdminCount}</div>
                        </div>
                        <div className="glass-morphism border border-glass-border rounded-xl p-4">
                            <div className="text-sm text-secondary mb-1">Admins</div>
                            <div className="text-2xl font-bold text-red-400">{users.filter(u => u.role === 'Admin').length}</div>
                        </div>
                        <div className="glass-morphism border border-glass-border rounded-xl p-4">
                            <div className="text-sm text-secondary mb-1">Active Users</div>
                            <div className="text-2xl font-bold text-green-400">{users.filter(u => u.isActive).length}</div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="glass-morphism border border-glass-border rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5 border-b border-glass-border">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Last Login</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-glass-border">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="flex items-center justify-center gap-2 text-secondary">
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Loading users...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                                                No users found. Create your first user!
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-white font-bold">
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-white">{user.username}</div>
                                                            <div className="text-xs text-secondary">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.isActive
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary">
                                                    {user.lastLoginAt
                                                        ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                        : 'Never'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary">
                                                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openPasswordModal(user.id)}
                                                            className="p-2 text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                            title="Reset Password"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => openModal(user)}
                                                            className="p-2 text-secondary hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user.id, user.username)}
                                                            className="p-2 text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add/Edit User Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-2xl font-bold text-white">
                                        {editingUser ? 'Edit User' : 'Add User'}
                                    </h2>
                                    <button
                                        onClick={closeModal}
                                        className="text-secondary hover:text-white"
                                        aria-label="Close"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-secondary mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className={`form-input ${errors.username ? 'border-red-500/50' : ''}`}
                                            placeholder="Enter username"
                                        />
                                        {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm text-secondary mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className={`form-input ${errors.email ? 'border-red-500/50' : ''}`}
                                            placeholder="Enter email"
                                        />
                                        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                                    </div>

                                    {!editingUser && (
                                        <div>
                                            <label className="block text-sm text-secondary mb-1">Password</label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className={`form-input ${errors.password ? 'border-red-500/50' : ''}`}
                                                placeholder="At least 6 characters"
                                            />
                                            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm text-secondary mb-1">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className={`form-input ${errors.role ? 'border-red-500/50' : ''}`}
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                        {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role}</p>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="w-4 h-4 rounded border-glass-border bg-white/5 text-accent focus:ring-accent"
                                        />
                                        <label htmlFor="isActive" className="text-sm text-white">Active Account</label>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="px-4 py-2 text-secondary hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
                                        >
                                            {editingUser ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Reset Password Modal */}
                    {showPasswordModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                                    <button
                                        onClick={() => setShowPasswordModal(false)}
                                        className="text-secondary hover:text-white"
                                        aria-label="Close"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-secondary mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="form-input"
                                            placeholder="At least 6 characters"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordModal(false)}
                                            className="px-4 py-2 text-secondary hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetPassword}
                                            className="px-5 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
                                        >
                                            Reset Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default UserManagementPage;
