import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  contactForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: [''],
      subject: [''],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      const formData = this.contactForm.value;
      
      // Prepare email content
      const emailSubject = formData.subject || 'Contact Form Submission';
      const emailBody = `Name: ${formData.name}
Contact Number: ${formData.contactNumber}
Email: ${formData.email}

Message: ${formData.message}`;

      // Create mailto link
      const mailtoLink = `mailto:info@mymenu.ai?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open default email client
      window.location.href = mailtoLink;

      // Optional: Reset form after submission
      this.contactForm.reset();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach(field => {
        const control = this.contactForm.get(field);
        control?.markAsTouched();
      });
    }
  }
}