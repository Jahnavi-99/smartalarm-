import { AfterViewInit, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Alarm } from '../Models/alarm.model';
import { AlarmService } from '../services/alarm.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-alarm',
  templateUrl: './alarm.component.html',
  styleUrls: ['./alarm.component.scss'],
  standalone: false
})
export class AlarmComponent implements OnInit, OnDestroy, AfterViewInit {
  alarms: Alarm[] = [];
  selectedAlarmId: number | null = null;
  currentlyEditingId: number | null = null;
  newLabel: string = '';
  currentlyEditingTimeId: number | string = '';
  newTime: string = '';
  audio: HTMLAudioElement | null = null;
  selectedSound: string = 'Default';
  alarmId: number | null = null; // Add this property to store the alarmId from navigation state

  dayOptions: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(private alarmService: AlarmService, private cdRef: ChangeDetectorRef, private router: Router) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { alarmId: number };
    this.alarmId = state?.alarmId || null;

    if (!this.alarmId) {
      const historyState = window.history.state as { alarmId: number };
      this.alarmId = historyState?.alarmId;
    }

    console.log('Received alarmId:', this.alarmId);
  }

  ngOnInit(): void {
    this.alarms = this.alarmService.getAlarms();
    this.alarmService.setAlarms(this.alarms);

    // Play alarm if alarmId is present
    if (this.alarmId) {
      this.playAlarm();
    }
  }

  ngAfterViewInit(): void {
    this.alarms = this.alarmService.getAlarms();
    this.alarmService.setAlarms(this.alarms);
    this.cdRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.alarmService.setAlarms(this.alarms);
    this.alarmService.saveAlarms(this.alarms);
    console.log('Alarms saved to localStorage:', this.alarms);
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: Event): void {
    this.alarmService.setAlarms(this.alarms);
    this.alarmService.saveAlarms(this.alarms);
    console.log('Alarms saved on browser close/refresh:', this.alarms);
  }

  playAlarm(): void {
    const audio = new Audio('assets/sounds/alarm.mp3');
    audio.play().then(() => {
      console.log('Alarm sound is playing...');
    }).catch(error => {
      console.error('Error playing alarm:', error);
    });
  }

  openSoundPicker(alarm: Alarm): void {
    this.router.navigate(['/soundpicker'], { state: { alarmId: alarm.id } });
  }

  getSoundName(id: string): string {
    const sound = this.alarmService.getSoundById(id);
    return sound;
  }

  toggleAlarm(alarm: Alarm): void {
    this.alarmService.toggleAlarm(alarm.id);
  }

  toggleOptions(id: number): void {
    this.selectedAlarmId = this.selectedAlarmId === id ? null : id;
  }

  toggleDay(alarm: Alarm, day: string): void {
    const index = alarm.days.indexOf(day);
    if (index >= 0) {
      alarm.days.splice(index, 1);
    } else {
      alarm.days.push(day);
    }
  }

  get activeAlarms(): Alarm[] {
    return this.alarms.filter(a => a.group === 'Active');
  }

  get otherAlarms(): Alarm[] {
    return this.alarms.filter(a => a.group === 'Others');
  }

  startEditing(alarm: Alarm): void {
    if (!alarm.enabled) return;
    this.currentlyEditingId = alarm.id;
    this.newLabel = alarm.label;
  }

  startEditingTime(alarm: Alarm): void {
    if (!alarm.enabled) return;
    this.currentlyEditingTimeId = alarm.id;
    this.newTime = this.convertToISOTime(alarm.time);
    console.log(`Editing time for Alarm ID ${alarm.id}`);
  }

  convertToISOTime(timeStr: string): string {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    const now = new Date();
    const datePart = now.toISOString().split('T')[0];

    const isoTime = `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    return isoTime;
  }

  saveTime(alarm: Alarm): void {
    console.log('Save button clicked');
    console.log(`New Time: ${this.newTime}`);
    if (this.newTime) {
      alarm.time = this.formatTime(this.newTime);
      console.log(`Time saved for Alarm ID ${alarm.id}: ${alarm.time}`);
      alarm.enabled = true;  // ✅ Turn ON the toggle
      this.alarmService.ScheduleAlarmForDays(alarm); // Reschedule
    }
    this.currentlyEditingTimeId = '';
    this.cdRef.detectChanges();
  }
  
  
  

  updateTime(event: any): void {
    const selectedTime = event.detail.value; 
    if (selectedTime) {
      this.newTime = selectedTime; 
      console.log(`Selected time: ${this.newTime}`);
    }
  }

  exitTimeEditing(): void {
    this.currentlyEditingTimeId = ''; 
  }

  cancelTimeEditing(): void {
    const alarm = this.alarms.find(a => a.id === this.currentlyEditingTimeId);
    if (alarm) {
      alarm.enabled = false; 
    }
    this.currentlyEditingTimeId = '';
    this.cdRef.detectChanges();
  }
  
  

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; 
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }

  saveLabel(alarm: Alarm): void {
    if (this.newLabel.trim()) {
      alarm.label = this.newLabel.trim();
      alarm.enabled = true; 
    }
    this.currentlyEditingId = null;
  }
  

  logAllSelectedValues(): void {
    console.log('Alarms:', this.alarms);
    this.alarms.forEach(alarm => {
      console.log(`Alarm ID: ${alarm.id}`);
      console.log(`Label: ${alarm.label}`);
      console.log(`Time: ${alarm.time}`);
      console.log(`Days: ${alarm.days}`);
    });
  }

  playSound(event: any): void {
    const selectedSound = event.detail.value;
    if (!selectedSound) {
      this.selectedSound = 'alarm1'; // <-- Make sure 'Default.mp3' exists in assets/sounds/
      console.log('No sound selected. Using default:', selectedSound);
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    this.audio = new Audio(`assets/sounds/${selectedSound}.mp3`);
    this.audio.load();
    this.audio.play().then(() => {
      console.log('Sound is playing...');
    }).catch((err) => {
      console.error('Failed to play sound:', err);
    });
  }
}