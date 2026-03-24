import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-service-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './service-request.component.html',
  styleUrl: './service-request.component.css'
})
export class ServiceRequestComponent {
  ticketForm!: FormGroup;
  tickets: any[] = [];
  selectedTicket: any = null;
  showTicketForm = false;
  showTicketList = true;
  showTicketDetail = false;
  ticketCategories = [
    'Bug', 
    'Feature Request', 
    'Change Request',
    'Support Request',
    'Training Request',
    'Other'
  ];
  priorityLevels = ['Low', 'Medium', 'High', 'Critical'];
  statusOptions = ['New', 'In Progress', 'Pending', 'Resolved', 'Closed'];
  users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams'];
  sidebarOpen = true; // For mobile responsiveness
  darkMode = false; // For dark mode toggle
  today = new Date().toISOString().split('T')[0]; // For date fields default
  searchQuery = ''; // For search functionality
  notificationCount = 3; // For notification badge
  
  constructor(private fb: FormBuilder) {
    this.createForm();
    // Sample data for demonstration
    this.loadSampleTickets();
  }

  createForm() {
    this.ticketForm = this.fb.group({
      id: [this.generateTicketId()],
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: ['Bug', Validators.required],
      priority: ['Medium', Validators.required],
      status: ['New'],
      assignedTo: [''],
      reportedBy: ['', Validators.required],
      reportedDate: [new Date().toISOString().split('T')[0]],
      dueDate: [''],
      timeLogged: [0],
      attachments: [''],
      rootCause: [''],
      resolution: [''],
      comments: [[]],
      escalationLevel: [0], // For escalation matrix
      notifyOnStatusChange: [true], // For notification system
      notifyOnComment: [true] // For notification system
    });
  }

  generateTicketId() {
    return 'TKT-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }

  loadSampleTickets() {
    this.tickets = [
      {
        id: 'TKT-0001',
        title: 'Menu pricing calculation error',
        description: 'The system is calculating incorrect prices when applying seasonal discounts',
        category: 'Bug',
        priority: 'High',
        status: 'In Progress',
        assignedTo: 'Jane Smith',
        reportedBy: 'John Doe',
        reportedDate: '2023-06-15',
        dueDate: '2023-06-20',
        timeLogged: 4.5,
        rootCause: 'Discount calculation logic error',
        resolution: '',
        comments: [
          { user: 'Jane Smith', date: '2023-06-16', text: 'Investigating the calculation logic' }
        ]
      },
      {
        id: 'TKT-0002',
        title: 'Add support for seasonal menu items',
        description: 'Need to implement a feature to easily mark menu items as seasonal with date ranges',
        category: 'Feature Request',
        priority: 'Medium',
        status: 'New',
        assignedTo: '',
        reportedBy: 'Sarah Williams',
        reportedDate: '2023-06-14',
        dueDate: '2023-07-01',
        timeLogged: 0,
        rootCause: '',
        resolution: '',
        comments: []
      }
    ];
  }

  onSubmit() {
    if (this.ticketForm.valid) {
      const formData = this.ticketForm.value;
      
      if (this.selectedTicket) {
        // Update existing ticket
        const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
        if (index !== -1) {
          this.tickets[index] = {...formData};
          this.addAuditTrail('Updated ticket ' + formData.id);
        }
      } else {
        // Add new ticket
        this.tickets.unshift({...formData, comments: []});
        this.addAuditTrail('Created new ticket ' + formData.id);
      }
      
      this.resetForm();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.ticketForm.controls).forEach(field => {
        const control = this.ticketForm.get(field);
        control?.markAsTouched();
      });
    }
  }

  resetForm() {
    this.selectedTicket = null;
    this.showTicketForm = false;
    this.showTicketList = true;
    this.showTicketDetail = false;
    this.createForm();
  }

  viewTicket(ticket: any) {
    this.selectedTicket = ticket;
    this.showTicketList = false;
    this.showTicketForm = false;
    this.showTicketDetail = true;
    this.addAuditTrail('Viewed ticket ' + ticket.id);
  }

  editTicket(ticket: any) {
    this.selectedTicket = ticket;
    this.ticketForm.patchValue(ticket);
    this.showTicketList = false;
    this.showTicketForm = true;
    this.showTicketDetail = false;
    this.addAuditTrail('Editing ticket ' + ticket.id);
  }

  newTicket() {
    this.selectedTicket = null;
    this.createForm();
    this.showTicketList = false;
    this.showTicketForm = true;
    this.showTicketDetail = false;
  }

  addComment(ticketId: string, comment: string) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket && comment.trim()) {
      ticket.comments.push({
        user: 'Current User', // In a real app, this would be the logged-in user
        date: new Date().toISOString().split('T')[0],
        text: comment
      });
      this.addAuditTrail('Added comment to ticket ' + ticketId);
    }
  }

  updateStatus(ticketId: string, newStatus: any) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = newStatus as string;
      this.addAuditTrail(`Updated status of ticket ${ticketId} to ${newStatus}`);
      
      // If resolved, prompt for resolution details
      if (newStatus === 'Resolved') {
        // In a real app, you would show a modal or form for resolution details
        // console.log('Ticket resolved, collecting resolution details');
      }
    }
  }

  transferTicket(ticketId: string, newAssignee: any) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.assignedTo = newAssignee as string;
      this.addAuditTrail(`Transferred ticket ${ticketId} to ${newAssignee}`);
    }
  }

  logTime(ticketId: string, hours: any) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.timeLogged = (parseFloat(ticket.timeLogged) || 0) + Number(hours);
      this.addAuditTrail(`Logged ${hours} hours to ticket ${ticketId}`);
    }
  }

  searchTickets() {
    // This would filter tickets based on the search query
    // console.log('Searching for:', this.searchQuery);
    // In a real implementation, you would filter the tickets array
    alert(`Searching for tickets matching: ${this.searchQuery}`);
  }

  newChangeRequest() {
    this.selectedTicket = null;
    this.createForm();
    this.ticketForm.patchValue({
      category: 'Change Request',
      priority: 'Medium'
    });
    this.showTicketList = false;
    this.showTicketForm = true;
    this.showTicketDetail = false;
  }

  newTrainingRequest() {
    this.selectedTicket = null;
    this.createForm();
    this.ticketForm.patchValue({
      category: 'Training Request',
      priority: 'Low'
    });
    this.showTicketList = false;
    this.showTicketForm = true;
    this.showTicketDetail = false;
  }

  // Enhanced escalation function with escalation matrix
  escalateTicket(ticketId: string) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      // Implement escalation matrix logic
      if (ticket.priority !== 'Critical') {
        const priorities = this.priorityLevels;
        const currentIndex = priorities.indexOf(ticket.priority);
        if (currentIndex < priorities.length - 1) {
          ticket.priority = priorities[currentIndex + 1];
        }
      }
      
      // Increment escalation level
      ticket.escalationLevel = (ticket.escalationLevel || 0) + 1;
      
      // Notify management based on escalation level
      if (ticket.escalationLevel >= 3) {
        // In a real app, this would send notifications to senior management
        // console.log('ESCALATION LEVEL 3: Notifying senior management');
      } else if (ticket.escalationLevel >= 2) {
        // Notify department head
        // console.log('ESCALATION LEVEL 2: Notifying department head');
      } else {
        // Notify team lead
        // console.log('ESCALATION LEVEL 1: Notifying team lead');
      }
      
      this.addAuditTrail(`Escalated ticket ${ticketId} to ${ticket.priority} priority (Level ${ticket.escalationLevel})`);
    }
  }

  // Enhanced export function for reports
  exportTickets() {
    // In a real app, this would generate different report formats
    const reportType = prompt('Select report type: CSV, PDF, or Excel');
    if (reportType) {
      // console.log(`Exporting tickets in ${reportType} format:`, this.tickets);
      this.addAuditTrail(`Exported tickets report in ${reportType} format`);
      alert(`Tickets exported successfully in ${reportType} format!`);
    }
  }

  // Enhanced notification system
  sendNotification(ticketId: string, message: string, recipients: string[]) {
    // In a real app, this would send actual notifications
    // console.log(`NOTIFICATION for ticket ${ticketId}: ${message}`);
    // console.log(`Recipients: ${recipients.join(', ')}`);
    this.addAuditTrail(`Sent notification about ticket ${ticketId}`);
  }

  addAuditTrail(action: string) {
    // In a real app, this would log to a database
    // console.log(`AUDIT: ${new Date().toISOString()} - ${action}`);
  }

  isSLABreached(ticket: any): boolean {
    if (!ticket.dueDate) return false;
    
    const dueDate = new Date(ticket.dueDate);
    const today = new Date();
    return today > dueDate && ticket.status !== 'Resolved' && ticket.status !== 'Closed';
  }

  getTicketsByCategory() {
    const result: {[key: string]: number} = {};
    this.ticketCategories.forEach(category => {
      result[category] = this.tickets.filter(t => t.category === category).length;
    });
    return result;
  }

  getOpenTicketsCount(): number {
    return this.tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  }

  getResolvedTicketsCount(): number {
    return this.tickets.filter(t => t.status === 'Resolved').length;
  }

  getSLABreachedCount(): number {
    return this.tickets.filter(t => this.isSLABreached(t)).length;
  }

  // Add these helper methods to handle the type casting internally
  updateStatusFromEvent(ticketId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.updateStatus(ticketId, select.value);
  }
  
  transferTicketFromEvent(ticketId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.transferTicket(ticketId, select.value);
  }
  
  logTimeFromInput(ticketId: string, input: HTMLInputElement) {
    this.logTime(ticketId, +input.value);
  }
  
  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    document.documentElement.classList.toggle('dark');
    
    // If you're using charts, you'll need to destroy and recreate them with new colors
    // this.destroyCharts();
    // this.initCharts();
  }
  
  // Optional: Add this method if you implement charts
  // destroyCharts() {
  //   // Destroy any chart instances here
  // }
}

 
  
 