import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pageNumbers = [];
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(totalPages, 5);
  }
  if (currentPage + 2 >= totalPages) {
    startPage = Math.max(1, totalPages - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '20px', gap: '5px', flexWrap: 'wrap' }}>
      <button 
        disabled={currentPage === 1} 
        onClick={() => onPageChange(currentPage - 1)}
        style={{ 
          padding: '5px 10px', 
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          border: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
          color: '#000',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}
      >
        Prev
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              border: '1px solid #ccc',
              backgroundColor: currentPage === 1 ? '#4ca5af' : '#fff',
              color: currentPage === 1 ? '#fff' : '#000',
              borderRadius: '4px'
            }}
          >
            1
          </button>
          {startPage > 2 && <span style={{ padding: '5px 10px' }}>...</span>}
        </>
      )}

      {pageNumbers.map(number => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          style={{
            padding: '5px 15px',
            cursor: 'pointer',
            border: '1px solid #ccc',
            backgroundColor: currentPage === number ? '#4ca5af' : '#fff',
            color: currentPage === number ? '#fff' : '#000',
            borderRadius: '4px',
            fontWeight: currentPage === number ? 'bold' : 'normal'
          }}
        >
          {number}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span style={{ padding: '5px 10px' }}>...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              border: '1px solid #ccc',
              backgroundColor: currentPage === totalPages ? '#4ca5af' : '#fff',
              color: currentPage === totalPages ? '#fff' : '#000',
              borderRadius: '4px'
            }}
          >
            {totalPages}
          </button>
        </>
      )}

      <button 
        disabled={currentPage === totalPages} 
        onClick={() => onPageChange(currentPage + 1)}
        style={{ 
          padding: '5px 10px', 
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          border: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
          color: '#000',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
