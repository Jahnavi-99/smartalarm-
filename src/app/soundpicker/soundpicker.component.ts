import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Alarm } from '../Models/alarm.model';
import { AlarmService } from '../services/alarm.service';


@Component({
  selector: 'app-soundpicker',
  templateUrl: './soundpicker.component.html',
  styleUrls: ['./soundpicker.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class SoundpickerComponent {
  selectedSoundid: number | null = null;
  currentAudio: HTMLAudioElement | null = null;

  sounds = [
    { id: 1, name: 'Morning Breeze', path: 'assets/sounds/alarm1.mp3' ,alarmId:1},
    { id: 2, name: 'Gentle Chimes', path: 'assets/sounds/alarm2.mp3' ,alarmId:2}, 
    { id: 3, name: 'Forest Dawn', path: 'assets/sounds/alarm3.mp3' ,alarmId:3},
    { id: 4, name: 'Echo Pulse', path: 'assets/sounds/alarm4.mp3' ,alarmId:4},
    { id: 5, name: 'Crystal Bell', path: 'assets/sounds/alarm5.mp3' ,alarmId:5},
    { id: 6, name: 'Feather Wake', path: 'assets/sounds/alarm6.mp3' ,alarmId:6},
  ];
  alarms: Alarm[] = []; // Initialize alarms array
  alarm!:Alarm ; // Initialize alarm object

  constructor(private navCtrl: NavController,private route:ActivatedRoute,private alarmService:AlarmService) {
    this.alarms = this.alarmService.getAlarms(); // Fetch alarms from the service
    const navigation = history.state;
    if (navigation && navigation.alarmId) {
      const  alarmId  = navigation.alarmId;
      const alarm = this.alarms.find(a => a.id === Number(alarmId));
   if(alarm){
    this.alarm = alarm; // Set the alarm object if found
     if(alarm.sound) this.selectedSoundid = Number(alarm.sound); // Set the selected sound ID from the alarm object
    }
  }
}
ngOnDestroy(): void {
  this.alarmService.saveAlarms(this.alarms); // Save alarms to localStorage when component is destroyed
  console.log('Alarms saved to localStorage:', this.alarms);
  if (this.currentAudio) {
    this.currentAudio.pause();
    this.currentAudio.currentTime = 0;
  }
 }

 @HostListener('window:beforeunload', ['$event'])
 handleBeforeUnload(event: Event): void {
   this.alarmService.saveAlarms(this.alarms);
   if (this.currentAudio) {
     this.currentAudio.pause();
     this.currentAudio.currentTime = 0;
   }
   console.log('Alarms saved on browser close/refresh:', this.alarms);
 }
  selectSound(sound: any) {
    this.selectedSoundid = sound.id;
    // Stop previously playing sound
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.currentAudio = new Audio(sound.path);
    this.currentAudio.play().catch(err => {
      console.error('Sound play error:', err);
    });
  }

  saveSound() {
    console.log('Selected Sound ID:', this.selectedSoundid);
    this.alarm.sound = this.selectedSoundid?.toString()||""; // Save the selected sound ID to the alarm object
    this.alarms.find(a => a.id === this.alarm.id)!.sound = this.selectedSoundid?.toString()||""; // Update the alarm object in the alarms array
    this.alarmService.saveAlarms(this.alarms); // Save the updated alarms array to localStorage
    this.navCtrl.back();
  }

  cancel() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.navCtrl.back();
  }
}
