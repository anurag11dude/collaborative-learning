import Workspace from './elements/Workspace.js';
import LeftNav from './elements/LeftNav';
import BottomNav from './elements/BottomNav';
import RightNav from './elements/RightNav';
import Canvas from './elements/Canvas';
import LearningLog from './elements/LearningLog';
import Header from "./elements/Header";

let leftNav = new LeftNav,
    bottomNav = new BottomNav,
    rightNav = new RightNav,
    canvas = new Canvas,
    learningLog = new LearningLog,
    workspace = new Workspace,
    header = new Header;

function setupGroup(students, group){
    let qaClass = 88,
        qaOffering = 10,
        // qaGroup = 10,
        problem = 1.3;
    let teacher = 88;
    // let group = ['33','44','55','66'];

    const baseUrl = `${Cypress.config("baseUrl")}`;
    const queryParams = `${Cypress.config("queryParams")}`;
    let i=0;

    for (i=0;i<students.length;i++) {
        cy.wait(2000);
        cy.visit(baseUrl+'?appMode=demo&fakeClass='+qaClass+'&fakeUser=student:'+students[i]+'&problem='+problem+'&demoOffering=88');
        if (i>0){
            cy.get('.groups>.group-list>.group>.group-title').contains('Group '+ group).click()
        }
        else{
            cy.get('select').select('Group ' + group);
            cy.get('[value="Create Group"]').click();
        }
        cy.wait(1000);

        // leftNav.openLeftNavTab('Now What');
        // leftNav.openToWorkspace();
        // canvas.addTextTile();
        // canvas.enterText('This is to test the 4-up view of S'+students[i]);
        // canvas.getTextTile().last().should('contain', '4-up').and('contain','S'+students[i]);
        // canvas.addGraphTile();
        // canvas.addPointToGraph((30*i),(250/i));
        // canvas.shareCanvas();//all students will share their canvas
        // cy.wait(1000);
    }
    //verify Group num and there are 4 students in the group
    header.getGroupName().should('contain','Group '+group);
    header.getGroupMembers().each(($member,index, $list)=>{
        expect(['S'+students[0],'S'+students[1],'S'+students[2],'S'+students[3]]).to.include($member.text());
    });
}

context('create a lot of data', ()=>{
    it('will create groups', ()=>{
        let group1 = 1,
            students1 = [78,79,80,81],
            group2 = 2,
            students2 = [82,83,84,85],
            group3 = 3,
            students3 = [86,87,88,89];
        setupGroup(students1, group1);
        setupGroup(students2, group2);
        setupGroup(students3, group3);

    })
});