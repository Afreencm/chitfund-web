import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChitGroupList } from './chit-group-list';

describe('ChitGroupList', () => {
  let component: ChitGroupList;
  let fixture: ComponentFixture<ChitGroupList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChitGroupList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChitGroupList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
