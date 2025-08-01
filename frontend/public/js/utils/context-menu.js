export class ContextMenu {
    once = false;
    menuFactory(x, y, menuItems, data, svgId) {
        menuItems = menuItems.filter(d => d);
        const svg = document.querySelector(svgId);
        const svgBBox = svg.getBoundingClientRect();

        d3.select(`.contextMenu`).remove();
        
        // Draw the menu
        const entries = d3.select(svgId)
            .append('g').attr('class', 'contextMenu')
            .selectAll('tmp')
            .data(menuItems).enter()
            .append('g').attr('class', d => `menuEntry ${d.type}`)
        let orient = [true, true];
        
        let maxWidth = 0;
        menuItems.forEach(a => {
            const l = a.title.length * 12;
            if (l > maxWidth) {
                maxWidth = l;
            } 
        })
        
        if (x + maxWidth + 30 > svgBBox.width) {
            orient[0] = false;
        }

        const buttonHeight = 25;
        const sectionHeight = 2;
        const heightF = d => d && d.type === 'button' ? buttonHeight : sectionHeight;
        const calcHeight = (items) => {
            let height = 0;
            items.forEach(e => height += heightF(e));
            return height;
        }
        const totalHeight = calcHeight(menuItems);
        
        if (y + totalHeight + 50 > svgBBox.height) {
            orient[1] = false;
        }

        const xF = () => { return x - (orient[0] ? 0 : maxWidth) };
        const yF = (d, i) => y + calcHeight(menuItems.filter((e, ie) => ie < i)) - (orient[1] ? 0 : totalHeight);
        
  
          
        entries.style({ 'cursor': 'pointer' });

        entries
            .append('rect')
            .attr('x', xF)
            .attr('y', yF)
            .attr('width', maxWidth)
            .attr('height', heightF)
            .on('click', (_, d) => { d.action(_, data) });

        entries
            .append('text')
            .text((d) => { return d.type === 'button' ? d.title : ''; })
            .attr('x', xF)
            .attr('y', yF)
            .attr('dy', 15)
            .attr('dx', 15)
            .on('click', (_, d) => { d.action(_, data) });

        if (!this.once) {
            d3.select('body').on('click', () => {
                d3.select(`.contextMenu`).remove();
            }).on('ctxmenu', () => {
                d3.select(`.contextMenu`).remove();
            });
            this.once = true;
        }
    }

    create(event, data, menuItems, svgId) {
        if (menuItems.length > 0) {
            this.menuFactory(event.pageX, event.pageY - 40, menuItems, data, svgId);
        }
    }
}