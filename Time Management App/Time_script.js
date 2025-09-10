
// Global state
let tasks = [];
let scheduledTasks = [];
let currentDate = new Date();
let currentTaskInModal = null;
let taskTimers = {};
let selectedTaskForScheduling = null;
let draggedTask = null;
let currentTaskBeingEdited = null;

// Storage functions
function saveToStorage() {
    try {
        // Convert dates to strings for JSON serialization
        const tasksToSave = tasks.map(task => ({
            ...task,
            created: task.created ? task.created.toISOString() : null
        }));
        
        const scheduledTasksToSave = scheduledTasks.map(task => ({
            ...task,
            startTime: task.startTime ? task.startTime.toISOString() : null,
            created: task.created ? task.created.toISOString() : null
        }));
        
        localStorage.setItem('timeManagementTasks', JSON.stringify(tasksToSave));
        localStorage.setItem('timeManagementScheduledTasks', JSON.stringify(scheduledTasksToSave));
    } catch (error) {
        console.log('Storage not available, data will not persist');
    }
}

function loadFromStorage() {
    try {
        const savedTasks = localStorage.getItem('timeManagementTasks');
        const savedScheduledTasks = localStorage.getItem('timeManagementScheduledTasks');
        
        if (savedTasks) {
            tasks = JSON.parse(savedTasks).map(task => ({
                ...task,
                created: task.created ? new Date(task.created) : new Date()
            }));
        }
        
        if (savedScheduledTasks) {
            scheduledTasks = JSON.parse(savedScheduledTasks).map(task => ({
                ...task,
                startTime: task.startTime ? new Date(task.startTime) : null,
                created: task.created ? new Date(task.created) : new Date()
            }));
        }
    } catch (error) {
        console.log('Error loading saved data, starting fresh');
        tasks = [];
        scheduledTasks = [];
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage(); // Load saved data first
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000); // Update time every second
    setCurrentDate();
    renderCalendar();
    renderTasks();
    
    // Set timers for any existing scheduled tasks
    scheduledTasks.forEach(task => {
        if (task.startTime) {
            // Convert startTime to Date object if it's a string
            if (typeof task.startTime === 'string') {
                task.startTime = new Date(task.startTime);
            }
            setTaskTimer(task);
        }
    });
});

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    });
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        currentTimeElement.textContent = timeString;
    }
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    event.target.classList.add('active');

    // Show/hide appropriate buttons based on current page
    const addButton = document.getElementById('addTaskBtn');
    const scheduleButton = document.getElementById('scheduleTaskBtn');
    
    if (pageId === 'checklist') {
        addButton.style.display = 'flex';
        scheduleButton.style.display = 'none';
    } else if (pageId === 'schedule') {
        addButton.style.display = 'none';
        scheduleButton.style.display = 'flex';
        renderCalendar();
    } else {
        addButton.style.display = 'none';
        scheduleButton.style.display = 'none';
    }
}

function openTaskModal() {
    document.getElementById('taskModal').style.display = 'flex';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    // Clear form
    document.getElementById('modalTaskName').value = '';
    document.getElementById('modalEstimatedTime').value = '';
    document.getElementById('modalUrgency').value = 'low';
}

function addTask(event) {
    event.preventDefault();
    
    const taskName = document.getElementById('modalTaskName').value.trim();
    const estimatedTime = parseInt(document.getElementById('modalEstimatedTime').value);
    const urgency = document.getElementById('modalUrgency').value;
    
    // Validate inputs
    if (!taskName || !estimatedTime || estimatedTime <= 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    const task = {
        id: Date.now(),
        name: taskName,
        estimatedTime: estimatedTime,
        urgency: urgency,
        created: new Date()
    };
    
    tasks.push(task);
    saveToStorage(); // Save after adding task
    renderTasks();
    closeTaskModal();
}

function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveToStorage(); // Save after deleting task
    renderTasks();
}

// New scheduling functions
function openScheduleModal() {
    if (tasks.length === 0) {
        alert('No tasks available to schedule. Add some tasks to your checklist first!');
        return;
    }
    renderScheduleTasksList();
    document.getElementById('scheduleModal').style.display = 'flex';
}

function closeScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'none';
}

function renderScheduleTasksList() {
    const tasksList = document.getElementById('scheduleTasksList');
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: #64748b; font-style: italic; padding: 20px;">No tasks available. Add some tasks to your checklist first!</p>';
        return;
    }
    
    // Sort tasks by urgency for better selection
    const sortedTasks = tasks.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
    
    sortedTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-option';
        taskElement.innerHTML = `
            <div class="task-option-info">
                <div class="task-option-name">${task.name}</div>
                <div class="task-option-details">
                    <span>⏱️ ${task.estimatedTime} min</span>
                    <span class="urgency-${task.urgency}">🚨 ${task.urgency.toUpperCase()}</span>
                </div>
            </div>
            <button class="select-task-btn" onclick="selectTaskForTimeInput(${task.id})">
                Select
            </button>
        `;
        tasksList.appendChild(taskElement);
    });
}

function selectTaskForTimeInput(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    selectedTaskForScheduling = task;
    
    // Show task info in time input modal
    document.getElementById('selectedTaskInfo').innerHTML = `
        <strong>Task:</strong> ${task.name}<br>
        <strong>Duration:</strong> ${task.estimatedTime} minutes<br>
        <strong>Urgency:</strong> <span class="urgency-${task.urgency}">${task.urgency.toUpperCase()}</span>
    `;
    
    closeScheduleModal();
    document.getElementById('timeInputModal').style.display = 'flex';
}

function closeTimeInputModal() {
    document.getElementById('timeInputModal').style.display = 'none';
    selectedTaskForScheduling = null;
    document.getElementById('startTime').value = '';
}

function scheduleTaskWithTime(event) {
    event.preventDefault();
    
    if (!selectedTaskForScheduling) return;
    
    const startTimeInput = document.getElementById('startTime').value;
    if (!startTimeInput) {
        alert('Please select a start time.');
        return;
    }
    
    // Parse the time input
    const [hours, minutes] = startTimeInput.split(':').map(Number);
    const startTime = new Date(currentDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    // Check for time conflicts
    const endTime = new Date(startTime.getTime() + (selectedTaskForScheduling.estimatedTime * 60 * 1000));
    
    const hasConflict = scheduledTasks.some(scheduledTask => {
        const taskStart = new Date(scheduledTask.startTime);
        const taskEnd = new Date(taskStart.getTime() + (scheduledTask.estimatedTime * 60 * 1000));
        
        // Check if the new task overlaps with existing tasks on the same day
        if (taskStart.toDateString() === startTime.toDateString()) {
            return (startTime < taskEnd && endTime > taskStart);
        }
        return false;
    });
    
    if (hasConflict) {
        alert('Error: This time slot conflicts with an existing scheduled task. Please choose a different time.');
        return;
    }
    
    // Create scheduled task
    const scheduledTask = {
        ...selectedTaskForScheduling,
        startTime: startTime,
        scheduled: true
    };
    
    // Add to scheduled tasks
    scheduledTasks.push(scheduledTask);
    
    // Remove from tasks list
    tasks = tasks.filter(t => t.id !== selectedTaskForScheduling.id);
    
    // Save to storage
    saveToStorage();
    
    // Set timer for task completion (based on end time)
    setTaskTimer(scheduledTask);
    
    // Close modal and update displays
    closeTimeInputModal();
    renderCalendar();
    renderTasks();
    
    const timeStr = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    alert(`Task "${scheduledTask.name}" scheduled successfully for ${timeStr}!`);
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: #64748b; font-style: italic; padding: 40px;">No tasks yet. Click the + button to add your first task!</p>';
        return;
    }
    
    // Sort tasks by urgency
    const sortedTasks = tasks.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
    
    sortedTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <div class="task-info">
                <div class="task-name">${task.name}</div>
                <div class="task-details">
                    <span>⏱️ ${task.estimatedTime} min</span>
                    <span class="urgency-${task.urgency}">🚨 ${task.urgency.toUpperCase()}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        `;
        tasksList.appendChild(taskElement);
    });
}

// Calendar functions
function setCurrentDate() {
    currentDate = new Date();
    updateCurrentDateDisplay();
}

function updateCurrentDateDisplay() {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateStr = currentDate.toLocaleDateString('en-US', options);
    
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = dateStr;
    }
}

function changeDay(direction) {
    currentDate.setDate(currentDate.getDate() + direction);
    updateCurrentDateDisplay();
    renderCalendar();
}

function goToToday() {
    setCurrentDate();
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    grid.className = 'calendar-container'; // Use container class

    // Day header
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Create sticky header
    const headerContainer = document.createElement('div');
    headerContainer.className = 'calendar-header';
    
    // Create and append time header
    const timeHeader = document.createElement('div');
    timeHeader.className = 'time-slot';
    timeHeader.textContent = 'Time';
    headerContainer.appendChild(timeHeader);
    
    // Create and append day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.innerHTML = `${dayName}<br><small>${dayDate}</small>`;
    headerContainer.appendChild(dayHeader);
    
    grid.appendChild(headerContainer);

    // Create scrollable body
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'calendar-body';
    bodyContainer.id = 'calendarBody';

    // Time slots (12 AM to 11 PM) - Full 24 hours
    const startHour = 0;
    const endHour = 24;
    const cellHeight = 80; // Height of each hour cell in pixels
    
    for (let hour = startHour; hour < endHour; hour++) {
        let timeStr;
        if (hour === 0) {
            timeStr = '12:00 AM';
        } else if (hour < 12) {
            timeStr = `${hour}:00 AM`;
        } else if (hour === 12) {
            timeStr = '12:00 PM';
        } else {
            timeStr = `${hour - 12}:00 PM`;
        }
        
        // Create time slot label
        const timeSlotLabel = document.createElement('div');
        timeSlotLabel.className = 'time-slot';
        timeSlotLabel.textContent = timeStr;
        timeSlotLabel.style.background = 'white';
        bodyContainer.appendChild(timeSlotLabel);
        
        // Create calendar cell
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.style.minHeight = `${cellHeight}px`;
        cell.style.background = 'white';
        
        bodyContainer.appendChild(cell);
    }

    grid.appendChild(bodyContainer);
    
    // Now add scheduled tasks with proper positioning
    scheduledTasks.forEach(task => {
        if (new Date(task.startTime).toDateString() !== currentDate.toDateString()) {
            return; // Skip tasks not on current date
        }
        
        const taskStart = new Date(task.startTime);
        const startHourFloat = taskStart.getHours() + (taskStart.getMinutes() / 60);
        const durationHours = task.estimatedTime / 60;
        
        // Only show tasks that start within our time range (0-24 hours)
        if (startHourFloat >= startHour && startHourFloat < endHour) {
            const taskElement = document.createElement('div');
            taskElement.className = 'scheduled-task';
            
            // Calculate position and size
            const startOffset = startHourFloat - startHour; // Hours from start of grid
            const topPosition = (startOffset * cellHeight); // Position within the scrollable body
            const height = Math.max(durationHours * cellHeight, 30); // Minimum 30px height
            
            // Position the task element absolutely within the body container
            taskElement.style.position = 'absolute';
            taskElement.style.top = `${topPosition}px`;
            taskElement.style.height = `${height}px`;
            taskElement.style.left = '106px'; // Position in the day column (100px + 6px padding)
            taskElement.style.right = '5px';
            taskElement.style.zIndex = '10';
            
            // Format task content
            const finishTime = new Date(taskStart.getTime() + (task.estimatedTime * 60 * 1000));
            const startStr = taskStart.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            const finishStr = finishTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            // Adjust text content based on task height
            if (height >= 60) {
                // Full info for taller tasks
                taskElement.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 4px;">${task.name}</div>
                    <div style="font-size: 11px; opacity: 0.9;">${startStr} - ${finishStr}</div>
                    <div style="font-size: 10px; opacity: 0.8;">${task.estimatedTime} min</div>
                `;
            } else if (height >= 40) {
                // Medium info
                taskElement.innerHTML = `
                    <div style="font-weight: 600; font-size: 12px;">${task.name}</div>
                    <div style="font-size: 10px; opacity: 0.9;">${startStr} - ${finishStr}</div>
                `;
            } else {
                // Minimal info for short tasks
                taskElement.innerHTML = `
                    <div style="font-weight: 600; font-size: 11px;">${task.name}</div>
                `;
            }
            
            taskElement.addEventListener('click', function(e) {
                e.stopPropagation();
                openTaskEditModal(task);
            });
            
            // Add to the body container
            bodyContainer.appendChild(taskElement);
        }
    });

    // Auto-scroll to show current time if it's today
    const today = new Date();
    if (currentDate.toDateString() === today.toDateString()) {
        const currentHour = today.getHours();
        const scrollPosition = Math.max(0, (currentHour - 2) * cellHeight); // Show 2 hours before current time
        bodyContainer.scrollTop = scrollPosition;
    }
}

// Task editing functions
function openTaskEditModal(task) {
    currentTaskBeingEdited = task;
    
    // Format task info for display
    const startTime = new Date(task.startTime);
    const endTime = new Date(startTime.getTime() + (task.estimatedTime * 60 * 1000));
    
    const startStr = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    const endStr = endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    document.getElementById('editTaskInfo').innerHTML = `
        <strong>Task:</strong> ${task.name}<br>
        <strong>Scheduled:</strong> ${startStr} - ${endStr}<br>
        <strong>Duration:</strong> ${task.estimatedTime} minutes<br>
        <strong>Urgency:</strong> <span class="urgency-${task.urgency}">${task.urgency.toUpperCase()}</span>
    `;
    
    document.getElementById('taskEditModal').style.display = 'flex';
}

function closeTaskEditModal() {
    document.getElementById('taskEditModal').style.display = 'none';
    hideEditTimeForm();
    currentTaskBeingEdited = null;
}

function completeTaskEarly() {
    if (!currentTaskBeingEdited) return;
    
    // Clear any existing timer
    if (taskTimers[currentTaskBeingEdited.id]) {
        clearTimeout(taskTimers[currentTaskBeingEdited.id]);
        delete taskTimers[currentTaskBeingEdited.id];
    }
    
    // Remove from scheduled tasks
    scheduledTasks = scheduledTasks.filter(t => t.id !== currentTaskBeingEdited.id);
    
    saveToStorage(); // Save after completing task
    closeTaskEditModal();
    renderCalendar();
    alert(`Task "${currentTaskBeingEdited.name}" completed successfully! 🎉`);
}

function removeFromSchedule() {
    if (!currentTaskBeingEdited) return;
    
    if (confirm(`Are you sure you want to remove "${currentTaskBeingEdited.name}" from the schedule? It will be added back to your checklist.`)) {
        // Clear any existing timer
        if (taskTimers[currentTaskBeingEdited.id]) {
            clearTimeout(taskTimers[currentTaskBeingEdited.id]);
            delete taskTimers[currentTaskBeingEdited.id];
        }
        
        // Remove scheduled properties and add back to tasks
        const taskToReturn = {
            id: currentTaskBeingEdited.id,
            name: currentTaskBeingEdited.name,
            estimatedTime: currentTaskBeingEdited.estimatedTime,
            urgency: currentTaskBeingEdited.urgency,
            created: currentTaskBeingEdited.created
        };
        
        tasks.push(taskToReturn);
        
        // Remove from scheduled tasks
        scheduledTasks = scheduledTasks.filter(t => t.id !== currentTaskBeingEdited.id);
        
        saveToStorage(); // Save after removing from schedule
        closeTaskEditModal();
        renderCalendar();
        renderTasks();
        alert(`Task "${currentTaskBeingEdited.name}" removed from schedule and added back to checklist.`);
    }
}

function showEditTimeForm() {
    const task = currentTaskBeingEdited;
    if (!task) return;
    
    // Pre-fill the form with current values
    const startTime = new Date(task.startTime);
    const timeString = startTime.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('editStartTime').value = timeString;
    document.getElementById('editDuration').value = task.estimatedTime;
    document.getElementById('editTimeForm').style.display = 'block';
}

function hideEditTimeForm() {
    document.getElementById('editTimeForm').style.display = 'none';
}

function updateTaskTime(event) {
    event.preventDefault();
    
    if (!currentTaskBeingEdited) return;
    
    const newStartTimeInput = document.getElementById('editStartTime').value;
    const newDuration = parseInt(document.getElementById('editDuration').value);
    
    if (!newStartTimeInput || !newDuration || newDuration <= 0) {
        alert('Please provide valid time and duration values.');
        return;
    }
    
    // Parse the new time
    const [hours, minutes] = newStartTimeInput.split(':').map(Number);
    const newStartTime = new Date(currentTaskBeingEdited.startTime);
    newStartTime.setHours(hours, minutes, 0, 0);
    
    // Check for conflicts with other tasks (excluding the current task being edited)
    const newEndTime = new Date(newStartTime.getTime() + (newDuration * 60 * 1000));
    
    const hasConflict = scheduledTasks.some(scheduledTask => {
        if (scheduledTask.id === currentTaskBeingEdited.id) return false; // Skip the task being edited
        
        const taskStart = new Date(scheduledTask.startTime);
        const taskEnd = new Date(taskStart.getTime() + (scheduledTask.estimatedTime * 60 * 1000));
        
        // Check if the new task overlaps with existing tasks on the same day
        if (taskStart.toDateString() === newStartTime.toDateString()) {
            return (newStartTime < taskEnd && newEndTime > taskStart);
        }
        return false;
    });
    
    if (hasConflict) {
        alert('Error: This time slot conflicts with another scheduled task. Please choose a different time.');
        return;
    }
    
    // Clear existing timer
    if (taskTimers[currentTaskBeingEdited.id]) {
        clearTimeout(taskTimers[currentTaskBeingEdited.id]);
        delete taskTimers[currentTaskBeingEdited.id];
    }
    
    // Update the task
    const taskIndex = scheduledTasks.findIndex(t => t.id === currentTaskBeingEdited.id);
    if (taskIndex !== -1) {
        scheduledTasks[taskIndex].startTime = newStartTime;
        scheduledTasks[taskIndex].estimatedTime = newDuration;
        
        // Set new timer (based on new end time)
        setTaskTimer(scheduledTasks[taskIndex]);
        
        saveToStorage(); // Save after updating task time
    }
    
    closeTaskEditModal();
    renderCalendar();
    
    const timeStr = newStartTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    alert(`Task "${currentTaskBeingEdited.name}" updated successfully! New time: ${timeStr}, Duration: ${newDuration} minutes.`);
}

function setTaskTimer(task) {
    const now = new Date();
    const endTime = new Date(task.startTime.getTime() + (task.estimatedTime * 60 * 1000));
    const timeUntilEnd = endTime.getTime() - now.getTime();
    
    // Only set timer if the end time is in the future
    if (timeUntilEnd > 0) {
        const timeoutId = setTimeout(() => {
            showTaskCompletionModal(task);
        }, timeUntilEnd);
        
        taskTimers[task.id] = timeoutId;
    } else {
        // Task end time has already passed
        console.log(`Task "${task.name}" end time has already passed`);
    }
}

function showTaskCompletionModal(task) {
    currentTaskInModal = task;
    document.getElementById('modalTaskName').textContent = task.name;
    document.getElementById('taskCompletionModal').style.display = 'flex';
    document.getElementById('additionalTimeInput').style.display = 'none';
}

function completeTask(isCompleted) {
    if (isCompleted) {
        // Remove task from scheduled tasks
        scheduledTasks = scheduledTasks.filter(t => t.id !== currentTaskInModal.id);
        saveToStorage(); // Save after completing task
        document.getElementById('taskCompletionModal').style.display = 'none';
        renderCalendar();
        alert('Task completed successfully! 🎉');
    } else {
        // Show additional time input
        document.getElementById('additionalTimeInput').style.display = 'block';
    }
}

function addBackToChecklist() {
    if (!currentTaskInModal) return;
    
    const additionalTime = parseInt(document.getElementById('additionalTime').value) || 30;
    
    // Clear any existing timer for this task
    if (taskTimers[currentTaskInModal.id]) {
        clearTimeout(taskTimers[currentTaskInModal.id]);
        delete taskTimers[currentTaskInModal.id];
    }
    
    // Create a new task for the checklist with updated estimated time
    const updatedTask = {
        id: Date.now(), // New ID to avoid conflicts
        name: currentTaskInModal.name,
        estimatedTime: additionalTime,
        urgency: currentTaskInModal.urgency,
        created: new Date()
    };
    
    // Add back to tasks list
    tasks.push(updatedTask);
    
    // Remove from scheduled tasks
    scheduledTasks = scheduledTasks.filter(t => t.id !== currentTaskInModal.id);
    
    saveToStorage(); // Save after adding back to checklist
    
    // Close modal and update displays
    document.getElementById('taskCompletionModal').style.display = 'none';
    renderCalendar();
    renderTasks();
    
    alert(`Task "${currentTaskInModal.name}" added back to checklist with ${additionalTime} minutes estimated time.`);
}

// Close modals when clicking outside
document.getElementById('taskCompletionModal').onclick = function(event) {
    if (event.target === this) {
        this.style.display = 'none';
    }
};

document.getElementById('taskEditModal').onclick = function(event) {
    if (event.target === this) {
        closeTaskEditModal();
    }
};

document.getElementById('taskModal').onclick = function(event) {
    if (event.target === this) {
        closeTaskModal();
    }
};

let timerInterval = null;
let totalSeconds = 0;
let originalSeconds = 0;
let isRunning = false;
let isPaused = false;

// Initialize timer
function initializeTimer() {
    const hours = parseInt(document.getElementById('timerHours').value) || 0;
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
    
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
    originalSeconds = totalSeconds;
    updateDisplay();
    updateProgressBar();
}

// Update display
function updateDisplay() {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let display = '';
    if (hours > 0) {
        display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    document.getElementById('timerDisplay').textContent = display;
}

// Update progress bar
function updateProgressBar() {
    if (originalSeconds === 0) return;
    const progress = ((originalSeconds - totalSeconds) / originalSeconds) * 100;
    document.getElementById('timerProgressBar').style.width = progress + '%';
}

// Start timer
function startTimer() {
    if (totalSeconds <= 0) {
        initializeTimer();
        if (totalSeconds <= 0) {
            alert('Please set a valid time!');
            return;
        }
    }

    isRunning = true;
    isPaused = false;
    
    document.getElementById('timerStartBtn').style.display = 'none';
    document.getElementById('timerPauseBtn').style.display = 'inline-block';
    document.getElementById('timerDisplay').classList.add('running');
    document.getElementById('timerDisplay').classList.remove('paused');

    timerInterval = setInterval(() => {
        totalSeconds--;
        updateDisplay();
        updateProgressBar();

        if (totalSeconds <= 0) {
            timerComplete();
        }
    }, 1000);
}

// Pause timer
function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    isPaused = true;

    document.getElementById('timerStartBtn').style.display = 'inline-block';
    document.getElementById('timerPauseBtn').style.display = 'none';
    document.getElementById('timerDisplay').classList.remove('running');
    document.getElementById('timerDisplay').classList.add('paused');
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    isPaused = false;
    totalSeconds = originalSeconds;

    document.getElementById('timerStartBtn').style.display = 'inline-block';
    document.getElementById('timerPauseBtn').style.display = 'none';
    document.getElementById('timerDisplay').classList.remove('running', 'paused');

    updateDisplay();
    updateProgressBar();
}

// Reset timer
function resetTimer() {
    stopTimer();
    initializeTimer();
}

// Timer complete
function timerComplete() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    isPaused = false;

    document.getElementById('timerStartBtn').style.display = 'inline-block';
    document.getElementById('timerPauseBtn').style.display = 'none';
    document.getElementById('timerDisplay').classList.remove('running', 'paused');

    // Flash the timer
    const display = document.getElementById('timerDisplay');
    display.style.backgroundColor = '#4CAF50';
    display.style.color = 'white';
    
    setTimeout(() => {
        display.style.backgroundColor = '';
        display.style.color = '';
    }, 2000);

    // Alert or notification
    alert('Timer completed! 🎉');

    // Reset for next use
    totalSeconds = originalSeconds;
    updateDisplay();
    updateProgressBar();
}

// Set custom timer
function setCustomTimer() {
    stopTimer();
    initializeTimer();
    updateActiveQuickButton();
}

// Set quick timer
function setQuickTimer(minutes, seconds) {
    stopTimer();
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    document.getElementById('timerHours').value = hours;
    document.getElementById('timerMinutes').value = remainingMinutes;
    document.getElementById('timerSeconds').value = seconds;
    
    initializeTimer();
    updateActiveQuickButton(minutes);
}

// Update active quick button
function updateActiveQuickButton(activeMinutes = null) {
    const buttons = document.querySelectorAll('.quick-timer-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (activeMinutes !== null) {
        buttons.forEach(btn => {
            const btnText = btn.textContent;
            if ((activeMinutes === 5 && btnText === '5 min') ||
                (activeMinutes === 10 && btnText === '10 min') ||
                (activeMinutes === 15 && btnText === '15 min') ||
                (activeMinutes === 25 && btnText === '25 min') ||
                (activeMinutes === 30 && btnText === '30 min') ||
                (activeMinutes === 45 && btnText === '45 min') ||
                (activeMinutes === 60 && btnText === '1 hour')) {
                btn.classList.add('active');
            }
        });
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    } else if (event.code === 'Escape') {
        stopTimer();
    } else if (event.code === 'KeyR' && event.ctrlKey) {
        event.preventDefault();
        resetTimer();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTimer();
});
