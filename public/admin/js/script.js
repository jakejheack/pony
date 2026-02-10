var el = document.getElementById("wrapper");
var toggleButton = document.getElementById("menu-toggle");

toggleButton.onclick = function () {
    el.classList.toggle("toggled");
};

const API_BASE_URL = '/api/admin';

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const data = await response.json();

        // Dashboard counters
        if (document.getElementById('total-users')) document.getElementById('total-users').innerText = data.totalUsers;
        if (document.getElementById('total-hosts')) document.getElementById('total-hosts').innerText = data.totalHosts;
        if (document.getElementById('total-agencies')) document.getElementById('total-agencies').innerText = data.totalAgencies;
        if (document.getElementById('blocked-users')) document.getElementById('blocked-users').innerText = data.blockedUsers;

        // Recent users table
        if (document.getElementById('recent-users-table')) {
            const tbody = document.getElementById('recent-users-table');
            tbody.innerHTML = '';
            data.recentUsers.forEach((user, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <th scope="row">${index + 1}</th>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.username || 'N/A'}</td>
                    <td>${user.role || 'user'}</td>
                    <td>${user.country || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const users = await response.json();

        // Update counts on User Management page
        if (document.getElementById('users-total')) {
            document.getElementById('users-total').innerText = users.length;
            const males = users.filter(u => u.gender === 'male').length;
            const females = users.filter(u => u.gender === 'female').length;
            document.getElementById('users-males').innerText = males;
            document.getElementById('users-females').innerText = females;
        }

        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                const avatarUrl = user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `/${user.avatar}`) : 'https://via.placeholder.com/40';
                
                tr.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${avatarUrl}" class="avatar-sm me-2" alt="Avatar">
                            <div>
                                <div class="fw-bold">${user.name || 'User'}</div>
                                <div class="text-muted small">@${user.username || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${user.role || 'User'}</td>
                    <td>${user.user_type || 'Real'}</td>
                    <td>${user.wallet_balance || 0}</td>
                    <td><span class="badge bg-${user.status === 'blocked' ? 'danger' : 'success'}">${user.status || 'Active'}</span></td>
                    <td>${user.unique_id || '-'}</td>
                    <td>${user.gender || '-'}</td>
                    <td>${user.age || '-'}</td>
                    <td>${user.country || '-'}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-info text-white me-1"><i class="fas fa-info-circle"></i></button>
                        <button class="btn btn-sm btn-primary me-1"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-${user.status === 'blocked' ? 'success' : 'danger'}" onclick="toggleBlock(${user.id}, '${user.status}')">
                            <i class="fas fa-${user.status === 'blocked' ? 'check' : 'ban'}"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

async function toggleBlock(userId, currentStatus) {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    if (!confirm(`Are you sure you want to ${newStatus} this user?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            fetchUsers(); // Refresh table
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        console.error(error);
        alert('Error updating status');
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('total-users')) {
        fetchStats();
    }
    // users.html calls fetchUsers explicitly in its inline script, or we can detect it here
    if (document.getElementById('users-table-body') && !window.location.href.includes('users.html')) {
        // Just in case script is loaded and logic matches, but index.html doesn't have users-table-body usually
    }
});
