document.addEventListener("DOMContentLoaded", () => {

    // --- State Management ---
    let state = {
        currentUser: null,
        users: JSON.parse(localStorage.getItem('alloc_users_v2')) || [],
        subjects: JSON.parse(localStorage.getItem('alloc_subjects_v2')) || [],
        /**
         * NEW Allocation Structure:
         * { id, studentEmail, studentName, subjectCode, subjectName, status }
         * status: 'pending', 'approved', 'rejected'
         */
        allocations: JSON.parse(localStorage.getItem('alloc_allocations_v2')) || []
    };

    // --- Utility Functions ---
    function saveToLocalStorage(key, data) {
        localStorage.setItem(`alloc_${key}_v2`, JSON.stringify(data));
    }
    
    function saveToSessionStorage(user) {
        sessionStorage.setItem('alloc_currentUser_v2', JSON.stringify(user));
    }
    
    function loadFromSessionStorage() {
        const user = sessionStorage.getItem('alloc_currentUser_v2');
        return user ? JSON.parse(user) : null;
    }

    function clearSessionStorage() {
        sessionStorage.removeItem('alloc_currentUser_v2');
    }

    function hideAllAuthErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    }

    function hideAllViews() {
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.remove('active');
        });
    }

    function showView(viewId) {
        hideAllViews();
        const view = document.getElementById(viewId);
        if (view) {
            view.classList.add('active');
        } else {
            console.error(`View with ID ${viewId} not found.`);
        }
    }

    function updateActiveNav(activeLink) {
        document.querySelectorAll('#app-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === activeLink) {
                link.classList.add('active');
            }
        });
    }
    
    function showTemporaryMessage(elementId, message, isError = true, duration = 3000) {
        const el = document.getElementById(elementId);
        el.innerText = message;
        el.style.color = isError ? 'var(--status-rejected)' : 'var(--status-approved)';
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, duration);
    }
    
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }


    // --- Authentication Logic ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const logoutButton = document.getElementById('logout-button');

    showRegisterLink.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        hideAllAuthErrors();
    });

    showLoginLink.addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        hideAllAuthErrors();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAllAuthErrors();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;

        if (state.users.find(user => user.email === email)) {
            document.getElementById('register-error').style.display = 'block';
        } else {
            const newUser = { id: generateId(), name, email, password, role };
            state.users.push(newUser);
            saveToLocalStorage('users', state.users);
            loginUser(newUser);
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAllAuthErrors();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const user = state.users.find(user => user.email === email && user.password === password);

        if (user) {
            loginUser(user);
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    function loginUser(user) {
        state.currentUser = user;
        saveToSessionStorage(user);
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initializeAppUI();
    }

    logoutButton.addEventListener('click', () => {
        state.currentUser = null;
        clearSessionStorage();
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loginForm.reset();
        registerForm.reset();
        hideAllAuthErrors();
    });


    // --- Main Application UI ---
    const appNav = document.getElementById('app-nav');
    const userDisplay = document.getElementById('user-display');
    
    // Admin nav links with icons
    const adminNav = `
        <ul>
            <li><a href="#" class="nav-link" data-view="view-admin-dashboard"><svg class="icon"><use href="#icon-dashboard"></use></svg>Dashboard</a></li>
            <li><a href="#" class="nav-link" data-view="view-admin-allocation-requests"><svg class="icon"><use href="#icon-send"></use></svg>Allocation Requests</a></li>
            <li><a href="#" class="nav-link" data-view="view-admin-manual-allocation"><svg class="icon"><use href="#icon-add-task"></use></svg>Manual Allocation</a></li>
            <li><a href="#" class="nav-link" data-view="view-admin-manage-subjects"><svg class="icon"><use href="#icon-book"></use></svg>Manage Subjects</a></li>
            <li><a href="#" class="nav-link" data-view="view-admin-report"><svg class="icon"><use href="#icon-report"></use></svg>Full Report</a></li>
        </ul>
    `;
    
    // Student nav links with icons
    const studentNav = `
        <ul>
            <li><a href="#" class="nav-link" data-view="view-student-dashboard"><svg class="icon"><use href="#icon-dashboard"></use></svg>Dashboard</a></li>
            <li><a href="#" class="nav-link" data-view="view-student-all-subjects"><svg class="icon"><use href="#icon-list"></use></svg>Request Subjects</a></li>
            <li><a href="#" class="nav-link" data-view="view-student-my-allocations"><svg class="icon"><use href="#icon-check"></use></svg>My Allocations</a></li>
            <li><a href="#" class="nav-link" data-view="view-student-profile"><svg class="icon"><use href="#icon-profile"></use></svg>My Profile</a></li>
        </ul>
    `;
    
    function initializeAppUI() {
        if (!state.currentUser) return;
        const { name, role } = state.currentUser;
        userDisplay.innerHTML = `Welcome, <strong>${name}</strong> (${role})`;
        
        if (role === 'admin') {
            appNav.innerHTML = adminNav;
            document.getElementById('welcome-admin').innerText = `Welcome, ${name}!`;
            showView('view-admin-dashboard');
            updateActiveNav('view-admin-dashboard');
            // Load all admin data
            renderAdminDashboard();
            renderManageSubjectsList();
            renderPendingRequestsList();
            populateManualAllocationDropdowns();
            renderAllocationReport();
            
        } else { // Student
            appNav.innerHTML = studentNav;
            document.getElementById('welcome-student').innerText = `Welcome, ${name}!`;
            showView('view-student-dashboard');
            updateActiveNav('view-student-dashboard');
            // Load all student data
            renderStudentDashboard();
            renderAllSubjectsList();
            renderMyAllocationsList();
            renderProfile();
        }
    }
    
    appNav.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('.nav-link'); // Find the link
        if (target) {
            const viewId = target.dataset.view;
            showView(viewId);
            updateActiveNav(viewId);
        }
    });

    // --- Admin Dashboard ---
    function renderAdminDashboard() {
        document.getElementById('admin-stat-subjects').innerText = state.subjects.length;
        document.getElementById('admin-stat-pending').innerText = state.allocations.filter(a => a.status === 'pending').length;
        document.getElementById('admin-stat-students').innerText = state.users.filter(u => u.role === 'student').length;
    }

    // --- Admin: Manage Subjects ---
    const createSubjectForm = document.getElementById('create-subject-form');
    const manageSubjectsList = document.getElementById('manage-subjects-list');
    
    createSubjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('subject-name').value;
        const code = document.getElementById('subject-code').value;
        const teacher = document.getElementById('subject-teacher').value;
        
        if (state.subjects.find(s => s.code === code)) {
            showTemporaryMessage('subject-form-error', 'A subject with this code already exists.');
            return;
        }
        
        const newSubject = { id: generateId(), name, code, teacher };
        state.subjects.push(newSubject);
        saveToLocalStorage('subjects', state.subjects);
        
        renderManageSubjectsList();
        populateManualAllocationDropdowns(); // Refresh dropdown
        renderAdminDashboard(); // Update stats
        createSubjectForm.reset();
    });
    
    function renderManageSubjectsList() {
        manageSubjectsList.innerHTML = '';
        if (state.subjects.length === 0) {
            manageSubjectsList.innerHTML = '<p class="empty-state">No subjects created yet.</p>';
            return;
        }
        
        state.subjects.forEach(subject => {
            const li = document.createElement('li');
            li.className = 'data-list-item';
            li.innerHTML = `
                <div class="item-info">
                    ${subject.name} <span>${subject.code} &bull; ${subject.teacher}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary btn-edit-subject" data-id="${subject.id}">
                        <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-edit"></use></svg>Edit
                    </button>
                    <button class="btn btn-small btn-danger btn-delete-subject" data-id="${subject.id}" data-code="${subject.code}">
                        <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-delete"></use></svg>Delete
                    </button>
                </div>
            `;
            manageSubjectsList.appendChild(li);
        });
    }
    
    manageSubjectsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        if (target.classList.contains('btn-delete-subject')) {
            const subjectId = target.dataset.id;
            const subjectCode = target.dataset.code;
            
            if (confirm(`Are you sure? This will delete the subject AND all student allocations for it.`)) {
                state.subjects = state.subjects.filter(s => s.id !== subjectId);
                state.allocations = state.allocations.filter(a => a.subjectCode !== subjectCode);
                
                saveToLocalStorage('subjects', state.subjects);
                saveToLocalStorage('allocations', state.allocations);
                
                // Refresh all admin views
                renderManageSubjectsList();
                renderAllocationReport();
                renderPendingRequestsList();
                populateManualAllocationDropdowns();
                renderAdminDashboard();
            }
        }
        
        if (target.classList.contains('btn-edit-subject')) {
            openEditModal(target.dataset.id);
        }
    });

    // --- Admin: Edit Subject Modal ---
    const editModal = document.getElementById('edit-subject-modal');
    const editForm = document.getElementById('edit-subject-form');
    const closeModalButton = editModal.querySelector('.close-button');
    
    function openEditModal(subjectId) {
        const subject = state.subjects.find(s => s.id === subjectId);
        if (!subject) return;
        
        document.getElementById('edit-subject-id').value = subject.id;
        document.getElementById('edit-subject-name').value = subject.name;
        document.getElementById('edit-subject-code').value = subject.code;
        document.getElementById('edit-subject-teacher').value = subject.teacher;
        editForm.dataset.originalCode = subject.code; 
        
        editModal.style.display = 'flex';
    }
    
    function closeEditModal() {
        editModal.style.display = 'none';
        editForm.reset();
        document.getElementById('edit-subject-error').style.display = 'none';
    }
    
    closeModalButton.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => e.target === editModal && closeEditModal());
    
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-subject-id').value;
        const name = document.getElementById('edit-subject-name').value;
        const code = document.getElementById('edit-subject-code').value;
        const teacher = document.getElementById('edit-subject-teacher').value;
        const originalCode = editForm.dataset.originalCode;

        const codeConflict = state.subjects.find(s => s.code === code && s.id !== id);
        if (codeConflict) {
            showTemporaryMessage('edit-subject-error', 'This subject code is already used.');
            return;
        }

        const subjectIndex = state.subjects.findIndex(s => s.id === id);
        if (subjectIndex > -1) {
            state.subjects[subjectIndex] = { id, name, code, teacher };
            saveToLocalStorage('subjects', state.subjects);
            
            if (originalCode !== code) {
                state.allocations.forEach(alloc => {
                    if (alloc.subjectCode === originalCode) {
                        alloc.subjectCode = code;
                        alloc.subjectName = name; // Update name too
                    }
                });
                saveToLocalStorage('allocations', state.allocations);
            }
            
            closeEditModal();
            renderManageSubjectsList();
            renderAllocationReport();
            populateManualAllocationDropdowns();
        }
    });

    // --- Admin: Allocation Requests (NEW) ---
    const pendingRequestsList = document.getElementById('pending-requests-list');

    function renderPendingRequestsList() {
        pendingRequestsList.innerHTML = '';
        const pending = state.allocations.filter(a => a.status === 'pending');
        
        if (pending.length === 0) {
            pendingRequestsList.innerHTML = '<p class="empty-state">No pending requests.</p>';
            return;
        }

        pending.forEach(alloc => {
            const li = document.createElement('li');
            li.className = 'data-list-item';
            li.innerHTML = `
                <div class="item-info">
                    ${alloc.studentName} <span>Requesting: ${alloc.subjectName} (${alloc.subjectCode})</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-success btn-approve-request" data-id="${alloc.id}">
                        <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-check"></use></svg>Approve
                    </button>
                    <button class="btn btn-small btn-danger btn-reject-request" data-id="${alloc.id}">
                        <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-close"></use></svg>Reject
                    </button>
                </div>
            `;
            pendingRequestsList.appendChild(li);
        });
    }

    pendingRequestsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const allocId = target.dataset.id;
        const allocIndex = state.allocations.findIndex(a => a.id === allocId);
        if (allocIndex === -1) return;

        if (target.classList.contains('btn-approve-request')) {
            state.allocations[allocIndex].status = 'approved';
        } else if (target.classList.contains('btn-reject-request')) {
            state.allocations[allocIndex].status = 'rejected';
        }
        
        saveToLocalStorage('allocations', state.allocations);
        renderPendingRequestsList(); // Refresh this list
        renderAdminDashboard(); // Update stats
        renderAllocationReport(); // Update main report
    });

    // --- Admin: Manual Allocation (NEW) ---
    const manualStudentSelect = document.getElementById('manual-student-select');
    const manualSubjectSelect = document.getElementById('manual-subject-select');
    const manualAllocationForm = document.getElementById('manual-allocation-form');

    function populateManualAllocationDropdowns() {
        // Populate students
        manualStudentSelect.innerHTML = '<option value="">-- Choose a student --</option>';
        state.users.filter(u => u.role === 'student').forEach(student => {
            manualStudentSelect.innerHTML += `<option value="${student.email}">${student.name} (${student.email})</option>`;
        });

        // Populate subjects
        manualSubjectSelect.innerHTML = '<option value="">-- Choose a subject --</option>';
        state.subjects.forEach(subject => {
            manualSubjectSelect.innerHTML += `<option value="${subject.code}">${subject.name} (${subject.code})</option>`;
        });
    }
    
    manualAllocationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentEmail = manualStudentSelect.value;
        const subjectCode = manualSubjectSelect.value;
        
        if (!studentEmail || !subjectCode) {
            showTemporaryMessage('manual-alloc-error', 'Please select both a student and a subject.');
            return;
        }

        // Check if this allocation already exists
        const existing = state.allocations.find(a => a.studentEmail === studentEmail && a.subjectCode === subjectCode);
        
        if (existing) {
            showTemporaryMessage('manual-alloc-error', `This student is already allocated this subject (Status: ${existing.status}).`);
            return;
        }

        const student = state.users.find(u => u.email === studentEmail);
        const subject = state.subjects.find(s => s.code === subjectCode);

        // Create new, 'approved' allocation
        const newAllocation = {
            id: generateId(),
            studentEmail: student.email,
            studentName: student.name,
            subjectCode: subject.code,
            subjectName: subject.name,
            status: 'approved'
        };
        
        state.allocations.push(newAllocation);
        saveToLocalStorage('allocations', state.allocations);
        
        showTemporaryMessage('manual-alloc-error', 'Allocation created successfully!', false);
        renderAllocationReport(); // Refresh report
        manualAllocationForm.reset();
    });

    // --- Admin: Allocation Report ---
    const reportContainer = document.getElementById('report-container');

    function renderAllocationReport() {
        reportContainer.innerHTML = '';
        if (state.subjects.length === 0) {
            reportContainer.innerHTML = '<p class="empty-state">No subjects exist to report on.</p>';
            return;
        }

        state.subjects.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'card';
            let tableHTML = `<h3>${subject.name} (${subject.code})</h3><table class="report-table" style="width:100%; border-collapse: collapse;">
                <thead><tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Student Name</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Student Email</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Status</th>
                </tr></thead><tbody>`;
            
            const allocations = state.allocations.filter(a => a.subjectCode === subject.code);
            
            if (allocations.length === 0) {
                tableHTML += '<tr><td colspan="3" class="empty-state">No students allocated.</td></tr>';
            } else {
                allocations.forEach(alloc => {
                    tableHTML += `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${alloc.studentName}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${alloc.studentEmail}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">
                                <span class="status-badge ${alloc.status}">${alloc.status.toUpperCase()}</span>
                            </td>
                        </tr>
                    `;
                });
            }
            
            tableHTML += '</tbody></table>';
            card.innerHTML = tableHTML;
            reportContainer.appendChild(card);
        });
    }

    // --- Student Dashboard ---
    function renderStudentDashboard() {
        const myAllocs = state.allocations.filter(a => a.studentEmail === state.currentUser.email);
        document.getElementById('student-stat-approved').innerText = myAllocs.filter(a => a.status === 'approved').length;
        document.getElementById('student-stat-pending').innerText = myAllocs.filter(a => a.status === 'pending').length;
        document.getElementById('student-stat-rejected').innerText = myAllocs.filter(a => a.status === 'rejected').length;
    }

    // --- Student: All Subjects (Request) ---
    const allSubjectsList = document.getElementById('all-subjects-list');
    
    function renderAllSubjectsList() {
        allSubjectsList.innerHTML = '';
        if (state.subjects.length === 0) {
            allSubjectsList.innerHTML = '<p class="empty-state">No subjects are available right now.</p>';
            return;
        }

        const myAllocations = state.allocations.filter(a => a.studentEmail === state.currentUser.email);

        state.subjects.forEach(subject => {
            const li = document.createElement('li');
            li.className = 'data-list-item';
            
            const existingAllocation = myAllocations.find(a => a.subjectCode === subject.code);
            let buttonHTML;

            if (existingAllocation) {
                switch (existingAllocation.status) {
                    case 'approved':
                        buttonHTML = '<button class="btn btn-small btn-success" disabled>Enrolled</button>';
                        break;
                    case 'pending':
                        buttonHTML = '<button class="btn btn-small btn-pending" disabled>Request Sent</button>';
                        break;
                    case 'rejected':
                        buttonHTML = '<button classs="btn btn-small btn-danger" disabled>Rejected</button>';
                        break;
                }
            } else {
                buttonHTML = `<button class="btn btn-small btn-primary btn-request-subject" data-code="${subject.code}">
                                <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-send"></use></svg>Request
                            </button>`;
            }
            
            li.innerHTML = `
                <div class="item-info">
                    ${subject.name} <span>${subject.code} &bull; ${subject.teacher}</span>
                </div>
                <div class="item-actions">${buttonHTML}</div>
            `;
            allSubjectsList.appendChild(li);
        });
    }
    
    allSubjectsList.addEventListener('click', (e) => {
        const target = e.target.closest('button.btn-request-subject');
        if (target) {
            const subjectCode = target.dataset.code;
            const subject = state.subjects.find(s => s.code === subjectCode);
            
            const newRequest = {
                id: generateId(),
                studentEmail: state.currentUser.email,
                studentName: state.currentUser.name,
                subjectCode: subject.code,
                subjectName: subject.name,
                status: 'pending'
            };
            
            state.allocations.push(newRequest);
            saveToLocalStorage('allocations', state.allocations);
            
            // Refresh student views
            renderAllSubjectsList();
            renderMyAllocationsList();
            renderStudentDashboard();
        }
    });

    // --- Student: My Allocations ---
    const myAllocationsList = document.getElementById('my-allocations-list');
    
    function renderMyAllocationsList() {
        myAllocationsList.innerHTML = '';
        const myAllocs = state.allocations.filter(a => a.studentEmail === state.currentUser.email);
        
        if (myAllocs.length === 0) {
            myAllocationsList.innerHTML = '<p class="empty-state">You have not requested any subjects.</p>';
            return;
        }

        myAllocs.forEach(alloc => {
            let buttonHTML = '';
            if (alloc.status === 'approved') {
                buttonHTML = `<button class="btn btn-small btn-danger btn-drop-subject" data-id="${alloc.id}">
                                <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-delete"></use></svg>Drop Subject
                            </button>`;
            } else if (alloc.status === 'pending' || alloc.status === 'rejected') {
                buttonHTML = `<button class="btn btn-small btn-secondary btn-delete-request" data-id="${alloc.id}">
                                <svg class="icon" style="margin-right: 0.3rem;"><use href="#icon-delete"></use></svg>Delete Request
                            </button>`;
            }
        
            const li = document.createElement('li');
            li.className = 'data-list-item';
            li.innerHTML = `
                <div class="item-info">
                    ${alloc.subjectName} <span>(${alloc.subjectCode})</span>
                </div>
                <div class="item-actions">
                    <span class="status-badge ${alloc.status}">${alloc.status.toUpperCase()}</span>
                    ${buttonHTML}
                </div>
            `;
            myAllocationsList.appendChild(li);
        });
    }

    myAllocationsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const allocId = target.dataset.id;
        
        if (target.classList.contains('btn-drop-subject')) {
            if (confirm('Are you sure you want to drop this approved subject?')) {
                state.allocations = state.allocations.filter(a => a.id !== allocId);
            }
        } else if (target.classList.contains('btn-delete-request')) {
            if (confirm('Are you sure you want to delete this request?')) {
                state.allocations = state.allocations.filter(a => a.id !== allocId);
            }
        } else {
            return;
        }
        
        saveToLocalStorage('allocations', state.allocations);
        
        // Refresh all student views
        renderMyAllocationsList();
        renderAllSubjectsList();
        renderStudentDashboard();
    });
    
    // --- Student: Profile ---
    function renderProfile() {
        if (!state.currentUser) return;
        document.getElementById('profile-name').innerText = state.currentUser.name;
        document.getElementById('profile-email').innerText = state.currentUser.email;
        document.getElementById('profile-role').innerText = state.currentUser.role;
    }

    // --- Initial Application Load ---
    function checkSession() {
        const user = loadFromSessionStorage();
        if (user) {
            // Re-verify user exists in localStorage in case of weird state
            const fullUser = state.users.find(u => u.email === user.email);
            if (fullUser) {
                loginUser(fullUser);
            }
        }
    }
    
    checkSession();
});