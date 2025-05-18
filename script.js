// Initialize state
let isLoggedIn = false;
let currentUser = null;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const sections = document.querySelectorAll('section');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const opportunitiesList = document.getElementById('opportunitiesList');

// API URL
const API_URL = 'http://localhost:5000/api';

// Show section and handle URL update
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });

    // Update URL without reloading the page
    const newPath = sectionId === 'welcome' ? '/' : `/${sectionId}`;
    history.pushState({section: sectionId}, '', newPath);

    // Show/hide browse button based on login state
    if (isLoggedIn && sectionId !== 'browse') {
        browseBtn.classList.remove('hidden');
    } else {
        browseBtn.classList.add('hidden');
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.section) {
        showSection(event.state.section);
    } else {
        // Default to welcome section if no state
        showSection('welcome');
    }
});

// Initialize the correct section based on URL
function initializeFromURL() {
    const path = window.location.pathname;
    const section = path === '/' ? 'welcome' : path.substring(1);
    if (document.getElementById(section)) {
        showSection(section);
    } else {
        showSection('welcome');
    }
}

// Event Listeners
loginBtn.addEventListener('click', () => showSection('login'));
registerBtn.addEventListener('click', () => showSection('register'));

// Browse button functionality
const browseBtn = document.getElementById('browseBtn');
browseBtn.addEventListener('click', () => {
    showSection('browse');
    loadOpportunitiesByCategory('all');
});

// Category buttons functionality
document.querySelectorAll('.category-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        // Add active class to clicked button
        button.classList.add('active');
        // Load opportunities for this category
        loadOpportunitiesByCategory(button.dataset.category);
    });
});

// Add 'All' category button if not present
const categories = document.querySelector('.categories');
if (!categories.querySelector('[data-category="all"]')) {
    const allButton = document.createElement('button');
    allButton.className = 'category-btn';
    allButton.dataset.category = 'all';
    allButton.textContent = 'All';
    categories.insertBefore(allButton, categories.firstChild);
    allButton.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        allButton.classList.add('active');
        loadOpportunitiesByCategory('all');
    });
}

// Load opportunities on page load
window.addEventListener('load', () => {
    // Initialize the application based on current URL
    initializeFromURL();
});

// Add Font Awesome for icons
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
document.head.appendChild(fontAwesome);

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Login successful!');
            isLoggedIn = true;
            currentUser = data;  // Store user data
            showSection('opportunities');
            browseBtn.classList.remove('hidden');
            
            // Load matched opportunities based on stored skills and location
            const userSkills = localStorage.getItem('userSkills');
            const userLocation = localStorage.getItem('userLocation');
            if (userSkills && userLocation) {
                const url = `${API_URL}/opportunities?skills=${userSkills}&location=${userLocation}`;
                const oppResponse = await fetch(url);
                if (oppResponse.ok) {
                    const opportunities = await oppResponse.json();
                    displayOpportunities(opportunities, 'opportunitiesList');
                }
            }
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        username: registerForm.querySelector('input[type="text"]').value,
        email: registerForm.querySelector('input[type="email"]').value,
        password: registerForm.querySelector('input[type="password"]').value,
        skills: registerForm.querySelectorAll('input[type="text"]')[1].value,
        interests: registerForm.querySelectorAll('input[type="text"]')[2].value,
        location: registerForm.querySelectorAll('input[type="text"]')[3].value,
    };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
            // Store user skills and location
            localStorage.setItem('userSkills', formData.skills);
            localStorage.setItem('userLocation', formData.location);
            alert('Registration successful! Please login.');
            showSection('login');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during registration');
    }
});

// Search Opportunities
async function searchOpportunities() {
    const skillsInput = document.getElementById('skillsSearch');
    const locationInput = document.getElementById('locationSearch');
    const skills = skillsInput.value.trim();
    const location = locationInput.value.trim();

    console.log('Searching with:', { skills, location });

    try {
        // Show loading state
        const opportunitiesList = document.getElementById('opportunitiesList');
        opportunitiesList.innerHTML = '<div class="loading">Searching for opportunities...</div>';

        const url = `${API_URL}/opportunities?skills=${encodeURIComponent(skills)}&location=${encodeURIComponent(location)}`;
        console.log('Fetching from:', url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const opportunities = await response.json();
        console.log('Received opportunities:', opportunities);

        // Display the results
        displayOpportunities(opportunities);

        // Update search feedback
        const searchFeedback = document.createElement('div');
        searchFeedback.className = 'search-feedback';
        searchFeedback.textContent = `Found ${opportunities.length} opportunities`;
        if (skills || location) {
            const terms = [];
            if (skills) terms.push(`skills: ${skills}`);
            if (location) terms.push(`location: ${location}`);
            searchFeedback.textContent += ` matching ${terms.join(' and ')}`;
        }
        
        opportunitiesList.insertBefore(searchFeedback, opportunitiesList.firstChild);

        // Update placeholders
        skillsInput.placeholder = skills || 'Enter skills (e.g., teaching, coding)';
        locationInput.placeholder = location || 'Enter location';

    } catch (error) {
        console.error('Error:', error);
        opportunitiesList.innerHTML = `
            <div class="error">
                <h3>Error searching opportunities</h3>
                <p>Please try again</p>
            </div>
        `;
    }
}

// Load opportunities by category
async function loadOpportunitiesByCategory(category) {
    const browseList = document.getElementById('browseList');
    browseList.innerHTML = '<div class="loading">Loading opportunities...</div>';

    try {
        // Get user's skills and location from local storage if available
        const userSkills = localStorage.getItem('userSkills');
        const userLocation = localStorage.getItem('userLocation');

        let url = `${API_URL}/opportunities?browse=true`;
        if (category !== 'all') {
            url += `&category=${category}`;
        }
        if (userSkills && userLocation) {
            url += `&skills=${userSkills}&location=${userLocation}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const opportunities = await response.json();
        displayOpportunities(opportunities, 'browseList');
    } catch (error) {
        console.error('Error:', error);
        browseList.innerHTML = `
            <div class="error">
                <h3>Error loading opportunities</h3>
                <p>Please try again</p>
            </div>
        `;
    }
}

// Apply for opportunity
async function applyForOpportunity(opportunityId) {
    if (!isLoggedIn) {
        alert('Please log in to apply for opportunities');
        showSection('login');
        return;
    }

    try {
        // Check if already applied
        const checkResponse = await fetch(`${API_URL}/check-application?user_id=${currentUser.id}&opportunity_id=${opportunityId}`);
        const checkData = await checkResponse.json();

        if (checkData.hasApplied) {
            alert('You have already applied to this opportunity');
            return;
        }

        const notes = prompt('Add any additional notes for your application (optional):');
        if (notes === null) { // User clicked Cancel
            return;
        }


        const response = await fetch(`${API_URL}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                opportunity_id: opportunityId,
                notes: notes || ''
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Application submitted successfully! The organization will review your application.');
        } else {
            alert(data.error || 'Failed to submit application');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting application');
    }
}

// Display Opportunities
function displayOpportunities(opportunities, targetId = 'opportunitiesList') {
    const container = document.getElementById(targetId);
    container.innerHTML = '';
    
    if (opportunities.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No opportunities found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }

    opportunities.forEach(opportunity => {
        const card = document.createElement('div');
        card.className = 'opportunity-card';

        const skills = opportunity.required_skills.split(',').map(skill => 
            `<span class="skill-tag">${skill.trim()}</span>`
        ).join('');

        card.innerHTML = `
            <h3>${opportunity.title}</h3>
            <p class="organization"><i class="fas fa-building"></i> ${opportunity.organization}</p>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${opportunity.location}</p>
            <p class="description">${opportunity.description}</p>
            <div class="skills-container">
                <p class="skills-label">Required Skills:</p>
                <div class="skills-tags">${skills}</div>
            </div>
            <button class="apply-btn" onclick="applyForOpportunity('${opportunity.id}')">Apply Now</button>
        `;
        container.appendChild(card);
    });

    // No need for additional event listeners as we're using onclick handler directly
}
