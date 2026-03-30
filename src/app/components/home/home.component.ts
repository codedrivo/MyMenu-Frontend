import { Component, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactCardComponent } from '../contact-card/contact-card.component';
import { Router } from '@angular/router';
import { Fancybox } from "@fancyapps/ui";
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { PricingCardComponent } from "../pricing-card/pricing-card.component";
Swiper.use([Navigation, Pagination, Autoplay]);
import { NumberFormatPipe } from '../../number-format.pipe';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ContactCardComponent, PricingCardComponent, NumberFormatPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements AfterViewInit {
  @ViewChild('backgroundVideo') videoElement!: ElementRef<HTMLVideoElement>;
  
  imageOpacity: number = 1;
  backgroundColor: string = 'transparent';
  videoLoaded: boolean = false;
  private playAttempts: number = 0;
  private maxPlayAttempts: number = 3;

  constructor(private router: Router) {
  }

  ngAfterViewInit(): void {
    // Set up intersection observer for better performance
    this.setupVideoPlayback();
    new Swiper('.testimonial-slider', {
      slidesPerView: 4,
      spaceBetween: 24,
      loop: true,
      autoplay: {
        delay: 2000,
        disableOnInteraction: false
      },
      breakpoints: {
        320: { slidesPerView: 1 },
        500: { slidesPerView: 2 },
        800: { slidesPerView: 3 },
        1140: { slidesPerView: 4 }
      }
    });
  }

  onVideoLoaded(): void {
    this.videoLoaded = true;
    this.tryPlayVideo();
  }

  tryPlayVideo(): void {
    if (!this.videoElement?.nativeElement || this.playAttempts >= this.maxPlayAttempts) {
      return;
    }

    const video = this.videoElement.nativeElement;
    this.playAttempts++;

    // Ensure video is muted (required for autoplay)
    video.muted = true;
    video.volume = 0;

    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // console.log('Video autoplay started successfully');
          this.playAttempts = 0; // Reset on success
        })
        .catch((error) => {
          // console.log('Autoplay prevented:', error);
          // Fallback: try again after user interaction
          this.setupUserInteractionListener();
        });
    }
  }

  private setupVideoPlayback(): void {
    // Try to play video immediately
    setTimeout(() => this.tryPlayVideo(), 100);
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.videoElement?.nativeElement) {
        setTimeout(() => this.tryPlayVideo(), 200);
      }
    });
  }

  private setupUserInteractionListener(): void {
    const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll'];
    
    const handleInteraction = () => {
      this.tryPlayVideo();
      // Remove listeners after first interaction
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const scrollPosition = window.scrollY;
    const fadeThreshold = 500;
    this.imageOpacity = scrollPosition >= fadeThreshold ? 0 : 1;
    this.backgroundColor = this.imageOpacity === 0 ? 'white' : 'transparent';
  }



  openLetstart(): void {
    this.router.navigate(['/letsstart']);
  }
   openDemoVideo(): void {
    //this.router.navigate(['/demo-video']);
    Fancybox.show([
      {
        src: "/assets/MyMenuDemo-2.mp4",
        type: "html5video",
      },
    ]);
  }
  counter1 = 0;
  counter2 = 0;

  target1 = 1_000_000;      // 1M+
  target2 = 100_000_000;    // 100M+

  ngOnInit() {
    this.startCounter1();
    this.startCounter2();
  }

  startCounter1() {
    this.animate(this.target1, (val) => {
      this.counter1 = val;
    });
  }

  startCounter2() {
    this.animate(this.target2, (val) => {
      this.counter2 = val;
    });
  }
  animate(target: number, update: (val: number) => void) {
    const duration = 2000;
    const startTime = performance.now();

    const run = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // smooth ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      update(target * ease);

      if (progress < 1) {
        requestAnimationFrame(run);
      } else {
        update(target); // stop exactly
      }
    };

    requestAnimationFrame(run);
  }
slides = [
  {
    title: '+9.2% Average Check Size',
    text: 'MyMenu.ai helped us identify pricing opportunities we never would have seen. We implemented changes with confidence—and the impact was immediate.',
    role: 'Owner',
    company: 'Multi-Location Restaurant Group'
  },
  {
    title: '+5.8% Profit in 2 Months',
    text: 'Pricing used to be slow, manual, and inconsistent. Now we have a clear system that shows what to change and why—across every location.',
    role: 'Operations Director',
    company: 'Regional Brand'
  },
  {
    title: 'Hours Saved Every Week',
    text: 'We replaced endless spreadsheet work with one simple screen. No analysts, no delays—just clear recommendations and fast execution.',
    role: 'General Manager',
    company: 'Fast Casual'
  },
  {
    title: 'Better Decision Making',
    text: 'Now we take pricing decisions based on data, not guesswork. The results speak for themselves.',
    role: 'CEO',
    company: 'Restaurant Chain'
  },
  {
    title: '+9.2% Average Check Size',
    text: 'MyMenu.ai helped us identify pricing opportunities we never would have seen. We implemented changes with confidence—and the impact was immediate.',
    role: 'Owner',
    company: 'Multi-Location Restaurant Group'
  },
  {
    title: '+5.8% Profit in 2 Months',
    text: 'Pricing used to be slow, manual, and inconsistent. Now we have a clear system that shows what to change and why—across every location.',
    role: 'Operations Director',
    company: 'Regional Brand'
  },
  {
    title: 'Hours Saved Every Week',
    text: 'We replaced endless spreadsheet work with one simple screen. No analysts, no delays—just clear recommendations and fast execution.',
    role: 'General Manager',
    company: 'Fast Casual'
  },
  {
    title: 'Better Decision Making',
    text: 'Now we take pricing decisions based on data, not guesswork. The results speak for themselves.',
    role: 'CEO',
    company: 'Restaurant Chain'
  }
];

  accordionData = [
  {
    title: 'How does MyMenu.ai generate pricing recommendations?',
    content: 'MyMenu.ai analyzes competitor pricing, local market trends, ingredient cost signals, customer behavior patterns, and seasonal demand to generate pricing recommendations tailored to your restaurant.'
  },
  {
    title: 'What data sources does MyMenu.ai use?',
    content: 'We aggregate data from multiple sources including restaurant websites, delivery platforms, industry reports, local market data, supplier pricing, and anonymized performance metrics from our network of restaurant partners.'
  },
  {
    title: 'How quickly can I see results?',
    content: 'Most restaurants see initial pricing insights within 24 hours of setup. Full optimization typically shows measurable revenue improvements within 2-4 weeks of implementation.'
  },
  {
    title: 'Does MyMenu.ai integrate with my existing POS system?',
    content: 'Yes, we integrate with most major POS systems including Square, Toast, Clover, and many others. Our team handles the technical setup to ensure seamless integration.'
  },
];
}