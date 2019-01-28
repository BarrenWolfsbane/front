import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { DropdownComponent } from "../dropdown/dropdown.component";

@Component({
  selector: 'm-sort-selector',
  templateUrl: './sort-selector.component.html',
})
export class SortSelectorComponent {
  algorithms: Array<{ id, label, icon?, noPeriod? }> = [
    {
      id: 'hot',
      label: 'Hot',
      icon: 'whatshot',
      noPeriod: true,
    },
    {
      id: 'top',
      label: 'Top',
      icon: 'thumb_up',
    },
    {
      id: 'controversial',
      label: 'Controversial',
      icon: 'thumbs_up_down',
    },
    {
      id: 'latest',
      label: 'Latest',
      icon: 'timelapse',
      noPeriod: true,
    },
  ];

  periods: Array<{ id, label }> = [
    {
      id: '12h',
      label: '12h',
    },
    {
      id: '24h',
      label: '24h',
    },
    {
      id: '7d',
      label: '7d',
    },
    {
      id: '30d',
      label: '30d',
    },
    {
      id: '1y',
      label: '1y'
    },
  ];

  @Input() isActive: boolean = false;

  @Input() algorithm: string;

  @Input() period: string;

  @Input() labelClass: string = "m--sort-selector-label";

  @Input() labelActiveClass: string = "m--sort-selector-label--active";

  @Input() except: Array<string> = [];

  @Input() caption: string = 'Sort:';

  @Output('onChange') onChangeEventEmitter = new EventEmitter<{ algorithm, period }>();

  @ViewChild('algorithmDropdown') algorithmDropdown: DropdownComponent;

  @ViewChild('periodDropdown') periodDropdown: DropdownComponent;

  getVisibleAlgorithms()  {
    return this.algorithms.filter(algorithm => this.except.indexOf(algorithm.id) === -1)
  }

  setAlgorithm(id: string) {
    if (!this.algorithms.find(algorithm => id === algorithm.id)) {
      console.error('Unknown algorithm');
      return false;
    }

    this.algorithm = id;
    this.emit();

    return true;
  }

  getCurrentAlgorithm() {
    return this.algorithms.find(algorithm => this.algorithm === algorithm.id);
  }

  getCurrentAlgorithmProp(prop: string) {
    const currentAlgorithm = this.getCurrentAlgorithm();

    if (!currentAlgorithm) {
      return 'Unknown';
    }

    return currentAlgorithm[prop];
  }

  setPeriod(id: string) {
    if (!this.periods.find(period => id === period.id)) {
      console.error('Unknown period');
      return false;
    }

    this.period = id;
    this.emit();

    return true;
  }

  getCurrentPeriod() {
    return this.periods.find(period => this.period === period.id)
  }

  getCurrentPeriodLabel() {
    const currentPeriod = this.getCurrentPeriod();

    if (!currentPeriod) {
      return 'All the time';
    }

    return currentPeriod.label;
  }

  hasCurrentAlgorithmPeriod() {
    const currentAlgorithm = this.getCurrentAlgorithm();

    if (!currentAlgorithm) {
      return false;
    }

    return !currentAlgorithm.noPeriod;
  }

  emit() {
    this.onChangeEventEmitter.emit({
      algorithm: this.algorithm,
      period: this.hasCurrentAlgorithmPeriod() ? this.period : null,
    });
  }

  closeDropdowns() {
    if (this.algorithmDropdown) {
      this.algorithmDropdown.close();
    }

    if (this.periodDropdown) {
      this.periodDropdown.close();
    }
  }
}
